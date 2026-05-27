"""Deterministic statement-to-receipt reconciliation."""

from __future__ import annotations

import math
import string
import unicodedata
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from difflib import SequenceMatcher
from typing import TYPE_CHECKING

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.statement import (
    ReconciliationRunStatus,
    ReconciliationVerdict,
    Statement,
    StatementLine,
    StatementReconciliationRun,
    StatementReconciliationVerdict,
    StatementStatus,
)
from app.models.transaction import Transaction
from app.schemas.statement import (
    StatementReconciliationBucketItem,
    StatementReconciliationLineSummary,
    StatementReconciliationReceiptSummary,
    StatementReconciliationResponse,
    StatementReconciliationRunResponse,
    StatementReconciliationVerdictResponse,
    StatementTransactionCandidate,
    StatementTransactionCandidateItem,
    as_statement_row_type,
)
from app.services.recurrence import recurrence_fields_from_statement_installment

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


class StatementNotReadyForReconciliationError(Exception):
    """Raised when a statement has not reached the extracted line state."""

    def __init__(self, status: StatementStatus) -> None:
        self.status = status
        super().__init__(f"Statement is {status.value}, cannot reconcile")


@dataclass(frozen=True)
class _CandidateMatch:
    transaction: Transaction
    score: float
    reasons: list[str]


_STATEMENT_CANDIDATE_ITEM_NAME = "Unidentified statement item"
_STATEMENT_TRANSACTION_LINE_TYPES = {
    "charge",
    "fee",
    "interest",
    "insurance",
    "tax",
    "adjustment",
    "other",
}


async def run_statement_reconciliation(
    db: AsyncSession,
    *,
    statement_id: uuid.UUID,
    ownership_scope_id: uuid.UUID | None = None,
) -> StatementReconciliationRun:
    """Create the current reconciliation run for one statement.

    Reconciliation is idempotent at the statement level: reruns replace the
    prior run and verdict rows instead of appending duplicate verdict history.
    """
    statement = await _load_statement(db, statement_id, ownership_scope_id)
    if statement.status not in {
        StatementStatus.EXTRACTED,
        StatementStatus.RECONCILING,
        StatementStatus.COMPLETED,
    }:
        raise StatementNotReadyForReconciliationError(statement.status)

    await db.execute(
        delete(StatementReconciliationRun).where(
            StatementReconciliationRun.statement_id == statement.id
        )
    )
    now = datetime.now(UTC)
    statement.status = StatementStatus.RECONCILING
    statement.updated_at = now
    run = StatementReconciliationRun(
        ownership_scope_id=statement.ownership_scope_id,
        statement_id=statement.id,
        status=ReconciliationRunStatus.RUNNING,
        started_at=now,
    )
    db.add(run)
    await db.flush()

    transactions = await _load_receipt_transactions(db, statement)
    verdicts = _build_verdicts(statement, run, transactions)
    for verdict in verdicts:
        db.add(verdict)

    matched_count = sum(
        1 for verdict in verdicts if verdict.verdict == ReconciliationVerdict.MATCHED
    )
    statement_only_count = sum(
        1 for verdict in verdicts if verdict.verdict == ReconciliationVerdict.STATEMENT_ONLY
    )
    receipt_only_count = sum(
        1 for verdict in verdicts if verdict.verdict == ReconciliationVerdict.RECEIPT_ONLY
    )
    ambiguous_count = sum(
        1 for verdict in verdicts if verdict.verdict == ReconciliationVerdict.AMBIGUOUS
    )
    failed_count = sum(1 for verdict in verdicts if verdict.verdict == ReconciliationVerdict.FAILED)
    total_statement_lines = len(statement.lines)

    run.status = ReconciliationRunStatus.COMPLETED
    run.total_statement_lines = total_statement_lines
    run.matched_count = matched_count
    run.statement_only_count = statement_only_count
    run.receipt_only_count = receipt_only_count
    run.ambiguous_count = ambiguous_count
    run.coverage_ratio = _coverage_ratio(matched_count, total_statement_lines)
    run.completed_at = datetime.now(UTC)
    run.updated_at = run.completed_at

    statement.status = StatementStatus.COMPLETED
    statement.reconciled_at = run.completed_at
    statement.updated_at = run.completed_at
    if failed_count:
        statement.warnings = sorted({*(statement.warnings or []), "reconciliation_failed_lines"})

    await db.commit()
    await db.refresh(run)
    return run


async def get_statement_reconciliation_response(
    db: AsyncSession,
    *,
    statement_id: uuid.UUID,
    ownership_scope_id: uuid.UUID,
) -> StatementReconciliationResponse | None:
    """Return the latest reconciliation run grouped into user-facing buckets."""
    run_row = await db.execute(
        select(StatementReconciliationRun)
        .where(
            StatementReconciliationRun.statement_id == statement_id,
            StatementReconciliationRun.ownership_scope_id == ownership_scope_id,
        )
        .order_by(
            StatementReconciliationRun.created_at.desc(), StatementReconciliationRun.id.desc()
        )
        .limit(1)
    )
    run = run_row.scalar_one_or_none()
    if run is None:
        return None

    statement = await _load_statement(db, statement_id, ownership_scope_id)
    verdict_rows = await db.execute(
        select(StatementReconciliationVerdict)
        .where(StatementReconciliationVerdict.run_id == run.id)
        .order_by(StatementReconciliationVerdict.created_at, StatementReconciliationVerdict.id)
    )
    verdicts = list(verdict_rows.scalars().all())
    line_map = await _line_map(db, verdicts)
    transaction_map = await _transaction_map(db, verdicts)
    buckets: dict[str, list[StatementReconciliationBucketItem]] = {
        "matched": [],
        "statement_only": [],
        "receipt_only": [],
        "ambiguous": [],
        "failed": [],
    }
    for verdict in verdicts:
        key = verdict.verdict.value
        line = line_map.get(verdict.statement_line_id)
        receipt_transaction = transaction_map.get(verdict.receipt_transaction_id)
        buckets[key].append(
            StatementReconciliationBucketItem(
                verdict=StatementReconciliationVerdictResponse.model_validate(verdict),
                statement_line=_line_summary(line),
                receipt_transaction=_receipt_summary(receipt_transaction),
                candidate_transaction=(
                    _transaction_candidate(statement, line)
                    if verdict.verdict == ReconciliationVerdict.STATEMENT_ONLY
                    else None
                ),
            )
        )

    return StatementReconciliationResponse(
        run=StatementReconciliationRunResponse.model_validate(run),
        matched=buckets["matched"],
        statement_only=buckets["statement_only"],
        receipt_only=buckets["receipt_only"],
        ambiguous=buckets["ambiguous"],
        failed=buckets["failed"],
    )


async def _load_statement(
    db: AsyncSession,
    statement_id: uuid.UUID,
    ownership_scope_id: uuid.UUID | None,
) -> Statement:
    query = (
        select(Statement).options(selectinload(Statement.lines)).where(Statement.id == statement_id)
    )
    if ownership_scope_id is not None:
        query = query.where(Statement.ownership_scope_id == ownership_scope_id)
    row = await db.execute(query)
    statement = row.scalar_one_or_none()
    if statement is None:
        raise LookupError("Statement not found")
    return statement


async def _load_receipt_transactions(
    db: AsyncSession,
    statement: Statement,
) -> list[Transaction]:
    query = select(Transaction).where(
        Transaction.ownership_scope_id == statement.ownership_scope_id,
        or_(Transaction.receipt_type.is_(None), Transaction.receipt_type != "statement"),
    )
    bounds = _date_bounds(statement)
    if bounds is not None:
        start, end = bounds
        query = query.where(
            Transaction.transaction_date >= start,
            Transaction.transaction_date <= end,
        )
    rows = await db.execute(query.order_by(Transaction.transaction_date, Transaction.id))
    return list(rows.scalars().all())


def _build_verdicts(
    statement: Statement,
    run: StatementReconciliationRun,
    transactions: list[Transaction],
) -> list[StatementReconciliationVerdict]:
    verdicts: list[StatementReconciliationVerdict] = []
    claimed_transaction_ids: set[uuid.UUID] = set()
    ambiguous_transaction_ids: set[uuid.UUID] = set()

    for line in statement.lines:
        if not line.ledger_ready:
            verdicts.append(
                _verdict(
                    run,
                    verdict=ReconciliationVerdict.STATEMENT_ONLY,
                    statement_line_id=line.id,
                    score=None,
                    reasons=["line_not_ledger_ready"],
                )
            )
            continue
        matches = sorted(
            (
                match
                for transaction in transactions
                if transaction.id not in claimed_transaction_ids
                for match in [_score_line_candidate(statement, line, transaction)]
                if match is not None
            ),
            key=lambda match: match.score,
            reverse=True,
        )
        if not matches:
            verdicts.append(
                _verdict(
                    run,
                    verdict=ReconciliationVerdict.STATEMENT_ONLY,
                    statement_line_id=line.id,
                    score=None,
                    reasons=["no_receipt_candidate"],
                )
            )
            continue

        if len(matches) > 1 and matches[0].score - matches[1].score <= 0.05:
            ambiguous_ids = [str(match.transaction.id) for match in matches[:5]]
            ambiguous_transaction_ids.update(match.transaction.id for match in matches)
            verdicts.append(
                _verdict(
                    run,
                    verdict=ReconciliationVerdict.AMBIGUOUS,
                    statement_line_id=line.id,
                    score=_score_decimal(matches[0].score),
                    reasons=[
                        "ambiguous_receipt_candidates",
                        f"candidate_count:{len(matches)}",
                        f"candidate_transaction_ids:{','.join(ambiguous_ids)}",
                    ],
                )
            )
            continue

        best = matches[0]
        claimed_transaction_ids.add(best.transaction.id)
        verdicts.append(
            _verdict(
                run,
                verdict=ReconciliationVerdict.MATCHED,
                statement_line_id=line.id,
                receipt_transaction_id=best.transaction.id,
                score=_score_decimal(best.score),
                reasons=best.reasons,
            )
        )

    excluded = claimed_transaction_ids | ambiguous_transaction_ids
    for transaction in transactions:
        if transaction.id in excluded:
            continue
        verdicts.append(
            _verdict(
                run,
                verdict=ReconciliationVerdict.RECEIPT_ONLY,
                receipt_transaction_id=transaction.id,
                score=None,
                reasons=["no_statement_line_candidate"],
            )
        )
    return verdicts


def _score_line_candidate(
    statement: Statement,
    line: StatementLine,
    transaction: Transaction,
) -> _CandidateMatch | None:
    reasons: list[str] = []
    if line.currency != transaction.currency:
        return None
    if (
        statement.card_alias_id is not None
        and transaction.card_alias_id is not None
        and statement.card_alias_id != transaction.card_alias_id
    ):
        return None
    if line.line_date is None:
        return None

    date_delta = abs((transaction.transaction_date - line.line_date).days)
    if date_delta > settings.statement_reconciliation_date_tolerance_days:
        return None
    reasons.append("same_date" if date_delta == 0 else f"date_tolerance:{date_delta}d")

    amount_delta = abs(transaction.total_minor - line.amount_minor)
    amount_tolerance = _amount_tolerance(line.amount_minor)
    if amount_delta > amount_tolerance:
        return None
    reasons.append("exact_amount" if amount_delta == 0 else f"amount_tolerance:{amount_delta}")

    merchant_score = _merchant_similarity(line.description, transaction.merchant)
    if merchant_score < settings.statement_reconciliation_merchant_similarity_threshold:
        return None
    reasons.append("exact_merchant" if merchant_score >= 0.999 else "fuzzy_merchant")

    alias_score = 0.0
    if statement.card_alias_id is not None and transaction.card_alias_id == statement.card_alias_id:
        alias_score = 1.0
        reasons.append("card_alias_match")

    date_score = 1 - (
        date_delta / max(settings.statement_reconciliation_date_tolerance_days, 1)
        if date_delta
        else 0
    )
    amount_score = 1 - (amount_delta / max(amount_tolerance, 1) if amount_delta else 0)
    score = (merchant_score * 0.4) + (amount_score * 0.3) + (date_score * 0.2) + (alias_score * 0.1)
    return _CandidateMatch(transaction=transaction, score=min(score, 1.0), reasons=reasons)


def _date_bounds(statement: Statement) -> tuple[date, date] | None:
    dates = [line.line_date for line in statement.lines if line.line_date is not None]
    if statement.period_start is not None:
        dates.append(statement.period_start)
    if statement.period_end is not None:
        dates.append(statement.period_end)
    if not dates:
        return None
    tolerance = timedelta(days=settings.statement_reconciliation_date_tolerance_days)
    return min(dates) - tolerance, max(dates) + tolerance


def _amount_tolerance(amount_minor: int) -> int:
    ratio = settings.statement_reconciliation_amount_tolerance_ratio
    return max(1, math.ceil(abs(amount_minor) * ratio))


def _merchant_similarity(left: str, right: str) -> float:
    normalized_left = _normalize_merchant(left)
    normalized_right = _normalize_merchant(right)
    if not normalized_left or not normalized_right:
        return 0.0
    if normalized_left == normalized_right:
        return 1.0
    if normalized_left in normalized_right or normalized_right in normalized_left:
        return 0.92
    left_tokens = set(normalized_left.split())
    right_tokens = set(normalized_right.split())
    token_score = (
        len(left_tokens & right_tokens) / max(len(left_tokens | right_tokens), 1)
        if left_tokens and right_tokens
        else 0.0
    )
    sequence_score = SequenceMatcher(None, normalized_left, normalized_right).ratio()
    return max(token_score, sequence_score)


def _normalize_merchant(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    table = str.maketrans({char: " " for char in string.punctuation})
    words = ascii_value.translate(table).casefold().split()
    ignored = {"spa", "ltda", "srl", "sa", "cl", "com", "www"}
    return " ".join(word for word in words if word not in ignored)


def _verdict(
    run: StatementReconciliationRun,
    *,
    verdict: ReconciliationVerdict,
    statement_line_id: uuid.UUID | None = None,
    receipt_transaction_id: uuid.UUID | None = None,
    score: Decimal | None = None,
    reasons: list[str] | None = None,
) -> StatementReconciliationVerdict:
    return StatementReconciliationVerdict(
        run_id=run.id,
        statement_line_id=statement_line_id,
        receipt_transaction_id=receipt_transaction_id,
        verdict=verdict,
        score=score,
        reasons=reasons or [],
    )


def _coverage_ratio(matched_count: int, total_statement_lines: int) -> Decimal:
    if total_statement_lines <= 0:
        return Decimal("0.0000")
    return (Decimal(matched_count) / Decimal(total_statement_lines)).quantize(Decimal("0.0001"))


def _score_decimal(score: float) -> Decimal:
    return Decimal(str(round(score, 3))).quantize(Decimal("0.001"))


async def _line_map(
    db: AsyncSession,
    verdicts: list[StatementReconciliationVerdict],
) -> dict[uuid.UUID | None, StatementLine]:
    ids = {verdict.statement_line_id for verdict in verdicts if verdict.statement_line_id}
    if not ids:
        return {}
    rows = await db.execute(select(StatementLine).where(StatementLine.id.in_(ids)))
    return {line.id: line for line in rows.scalars().all()}


async def _transaction_map(
    db: AsyncSession,
    verdicts: list[StatementReconciliationVerdict],
) -> dict[uuid.UUID | None, Transaction]:
    ids = {verdict.receipt_transaction_id for verdict in verdicts if verdict.receipt_transaction_id}
    if not ids:
        return {}
    rows = await db.execute(select(Transaction).where(Transaction.id.in_(ids)))
    return {transaction.id: transaction for transaction in rows.scalars().all()}


def _line_summary(line: StatementLine | None) -> StatementReconciliationLineSummary | None:
    if line is None:
        return None
    return StatementReconciliationLineSummary(
        id=line.id,
        statement_id=line.statement_id,
        source_order=line.source_order,
        row_type=as_statement_row_type(line.row_type),
        line_date=line.line_date,
        description=line.description,
        amount_minor=line.amount_minor,
        currency=line.currency,
        line_type=line.line_type.value,
        installment=line.installment,
        card_alias_candidate=line.card_alias_candidate,
        ledger_ready=line.ledger_ready,
        warnings=line.warnings,
    )


def _receipt_summary(
    transaction: Transaction | None,
) -> StatementReconciliationReceiptSummary | None:
    if transaction is None:
        return None
    return StatementReconciliationReceiptSummary(
        id=transaction.id,
        transaction_date=transaction.transaction_date,
        merchant=transaction.merchant,
        merchant_user_edited_at=transaction.merchant_user_edited_at,
        total_minor=transaction.total_minor,
        currency=transaction.currency,
        card_alias_id=transaction.card_alias_id,
        receipt_type=transaction.receipt_type,
    )


def _transaction_candidate(
    statement: Statement,
    line: StatementLine | None,
) -> StatementTransactionCandidate | None:
    """Build a ledger-ready transaction payload for a statement-only spend line."""
    if line is None or not line.ledger_ready or line.line_date is None or line.amount_minor <= 0:
        return None
    line_type = line.line_type.value
    if line_type not in _STATEMENT_TRANSACTION_LINE_TYPES:
        return None

    merchant = line.description.strip() or "Unknown statement merchant"
    recurrence_fields = recurrence_fields_from_statement_installment(line.installment)
    return StatementTransactionCandidate(
        transaction_date=line.line_date,
        merchant=merchant,
        store_category_source="unknown",
        total_minor=line.amount_minor,
        gross_total_minor=line.amount_minor,
        reconstructed_total_minor=line.amount_minor,
        currency=line.currency,
        receipt_type="statement",
        card_alias_id=statement.card_alias_id,
        **recurrence_fields,
        merchant_source="ai",
        items=[
            StatementTransactionCandidateItem(
                name=_STATEMENT_CANDIDATE_ITEM_NAME,
                qty=1.0,
                unit_price_minor=line.amount_minor,
                total_price_minor=line.amount_minor,
                category_source="statement_unidentified",
                is_flagged=True,
                sort_order=0,
            )
        ],
    )
