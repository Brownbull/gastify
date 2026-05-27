"""Local SQLite seed data for statement reconciliation prompt-lab reports."""

from __future__ import annotations

import math
import re
import string
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from typing import TYPE_CHECKING, Any

from sqlalchemy import delete, select, text
from sqlalchemy.engine import make_url

from app.config import settings
from app.db import async_session
from app.models.transaction import Transaction, TransactionItem
from app.models.user import User
from app.prompt_lab.statement.cases import StatementCase, list_statement_cases
from app.schemas.statement import StatementExtractionOutput, StatementLine

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

STATEMENT_LAB_SEED_PROMPT_PREFIX = "statement-lab-seed:"
STATEMENT_LAB_SEED_VERSION = "v1"
DEFAULT_STATEMENT_SEED_FIREBASE_UID = "local-user"
DEFAULT_STATEMENT_SEED_PROFILE = "representative"
_STATEMENT_TRANSACTION_LINE_TYPES = {
    "charge",
    "fee",
    "interest",
    "insurance",
    "tax",
    "adjustment",
    "other",
}


@dataclass(frozen=True)
class StatementSeedTransaction:
    id: uuid.UUID
    item_id: uuid.UUID
    case_id: str
    fixture_kind: str
    source_order: int | None
    transaction_date: date
    merchant: str
    total_minor: int
    currency: str
    receipt_type: str
    prompt_version: str


def statement_seed_marker(profile: str = DEFAULT_STATEMENT_SEED_PROFILE) -> str:
    return f"{STATEMENT_LAB_SEED_PROMPT_PREFIX}{STATEMENT_LAB_SEED_VERSION}:{profile}"


def assert_local_sqlite_seed_allowed(
    *,
    environment: str | None = None,
    database_url: str | None = None,
) -> dict[str, str]:
    """Return a sanitized DB descriptor or raise before local seed writes."""
    environment = (environment or settings.environment).strip().lower()
    database_url = database_url or settings.database_url
    url = make_url(database_url)
    if environment != "local":
        raise RuntimeError("statement seed DB writes are allowed only in GASTIFY_ENVIRONMENT=local")
    if not url.drivername.startswith("sqlite"):
        raise RuntimeError("statement seed DB writes require a SQLite database URL")
    return {
        "environment": environment,
        "url": url.render_as_string(hide_password=True),
    }


def build_statement_seed_transactions(
    cases: list[StatementCase],
    *,
    profile: str = DEFAULT_STATEMENT_SEED_PROFILE,
) -> tuple[list[StatementSeedTransaction], list[dict[str, Any]]]:
    """Build deterministic receipt-like app transactions from expected statement fixtures."""
    marker = statement_seed_marker(profile)
    transactions: list[StatementSeedTransaction] = []
    skipped: list[dict[str, Any]] = []

    for case in cases:
        if case.expected_path is None:
            skipped.append({"case_id": case.id, "reason": "missing_expected_fixture"})
            continue
        output = StatementExtractionOutput.model_validate_json(
            case.expected_path.read_text(encoding="utf-8")
        )
        spend_lines = _distinct_spend_lines(output.lines)
        if not spend_lines:
            skipped.append({"case_id": case.id, "reason": "no_spend_lines"})
            continue

        case_rows = _case_seed_transactions(
            case_id=case.id,
            output=output,
            spend_lines=spend_lines,
            marker=marker,
        )
        transactions.extend(case_rows)
        if len(spend_lines) < 4:
            skipped.append(
                {
                    "case_id": case.id,
                    "reason": "fewer_than_four_distinct_spend_lines",
                    "distinct_spend_lines": len(spend_lines),
                }
            )

    return transactions, skipped


async def seed_statement_lab_transactions(
    *,
    firebase_uid: str = DEFAULT_STATEMENT_SEED_FIREBASE_UID,
    profile: str = DEFAULT_STATEMENT_SEED_PROFILE,
    cases: list[StatementCase] | None = None,
    session_factory: Any = async_session,
) -> dict[str, Any]:
    """Reset and seed statement-lab transactions in the local SQLite database."""
    db = assert_local_sqlite_seed_allowed()
    if cases is None:
        cases = [case for case in list_statement_cases() if case.expected_path is not None]
    rows, skipped = build_statement_seed_transactions(cases, profile=profile)

    async with session_factory() as session:
        user = await _load_seed_user(session, firebase_uid=firebase_uid)
        transaction_columns = await _table_columns(session, "transactions")
        item_columns = await _table_columns(session, "transaction_items")
        if "prompt_version" not in transaction_columns:
            raise RuntimeError(
                "Local seed table 'transactions' is missing required column: prompt_version"
            )
        deleted = await _delete_prior_seed_rows(session, ownership_scope_id=user.ownership_scope_id)
        for row in rows:
            await _add_seed_transaction(
                session,
                row=row,
                ownership_scope_id=user.ownership_scope_id,
                transaction_columns=transaction_columns,
                item_columns=item_columns,
            )
        await session.commit()

    counts_by_kind: dict[str, int] = {}
    for row in rows:
        counts_by_kind[row.fixture_kind] = counts_by_kind.get(row.fixture_kind, 0) + 1

    return {
        "status": "seeded",
        "database": db,
        "firebase_uid": firebase_uid,
        "ownership_scope_id": str(user.ownership_scope_id),
        "profile": profile,
        "prompt_version": statement_seed_marker(profile),
        "reset_deleted_transactions": deleted,
        "inserted_transactions": len(rows),
        "counts_by_fixture_kind": dict(sorted(counts_by_kind.items())),
        "case_count": len(cases),
        "skipped": skipped,
        "transactions": [_seed_transaction_payload(row) for row in rows],
        "suggested_report_args": [
            "statement-report",
            "--actual-source",
            "mock-gemini",
            "--transaction-scope-firebase-uid",
            firebase_uid,
        ],
    }


async def _load_seed_user(session: AsyncSession, *, firebase_uid: str) -> User:
    result = await session.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()
    if user is None:
        raise RuntimeError(
            f"Local seed user '{firebase_uid}' was not found. Run scripts/dev/start-local.sh "
            "or scripts/dev/bootstrap-local-db.py first."
        )
    return user


async def _delete_prior_seed_rows(
    session: AsyncSession,
    *,
    ownership_scope_id: uuid.UUID,
) -> int:
    result = await session.execute(
        select(Transaction.id).where(
            Transaction.ownership_scope_id == ownership_scope_id,
            Transaction.prompt_version.like(f"{STATEMENT_LAB_SEED_PROMPT_PREFIX}%"),
        )
    )
    transaction_ids = list(result.scalars().all())
    if not transaction_ids:
        return 0
    await session.execute(
        delete(TransactionItem).where(TransactionItem.transaction_id.in_(transaction_ids))
    )
    await session.execute(delete(Transaction).where(Transaction.id.in_(transaction_ids)))
    return len(transaction_ids)


async def _add_seed_transaction(
    session: AsyncSession,
    *,
    row: StatementSeedTransaction,
    ownership_scope_id: uuid.UUID,
    transaction_columns: set[str],
    item_columns: set[str],
) -> None:
    await _insert_available_columns(
        session,
        table_name="transactions",
        available_columns=transaction_columns,
        required_columns={
            "id",
            "ownership_scope_id",
            "transaction_date",
            "merchant",
            "total_minor",
            "currency",
        },
        values={
            "id": row.id.hex,
            "ownership_scope_id": ownership_scope_id.hex,
            "transaction_date": row.transaction_date.isoformat(),
            "merchant": row.merchant,
            "total_minor": row.total_minor,
            "gross_total_minor": row.total_minor,
            "reconstructed_total_minor": row.total_minor,
            "currency": row.currency,
            "receipt_type": row.receipt_type,
            "prompt_version": row.prompt_version,
            "merchant_source": "ocr",
        },
    )
    await _insert_available_columns(
        session,
        table_name="transaction_items",
        available_columns=item_columns,
        required_columns={"id", "transaction_id", "name", "total_price_minor"},
        values={
            "id": row.item_id.hex,
            "transaction_id": row.id.hex,
            "name": "Statement lab seeded receipt item",
            "qty": 1.0,
            "unit_price_minor": row.total_minor,
            "total_price_minor": row.total_minor,
            "category_source": "ocr",
            "is_flagged": False,
            "sort_order": 0,
        },
    )


async def _table_columns(session: AsyncSession, table_name: str) -> set[str]:
    rows = await session.execute(text(f"pragma table_info({table_name})"))
    return {row[1] for row in rows.fetchall()}


async def _insert_available_columns(
    session: AsyncSession,
    *,
    table_name: str,
    available_columns: set[str],
    required_columns: set[str],
    values: dict[str, Any],
) -> None:
    missing = required_columns - available_columns
    if missing:
        raise RuntimeError(
            f"Local seed table '{table_name}' is missing required columns: "
            f"{', '.join(sorted(missing))}"
        )
    payload = {key: value for key, value in values.items() if key in available_columns}
    columns = list(payload)
    placeholders = [f":{column}" for column in columns]
    await session.execute(
        text(f"insert into {table_name} ({', '.join(columns)}) values ({', '.join(placeholders)})"),
        payload,
    )


def _case_seed_transactions(
    *,
    case_id: str,
    output: StatementExtractionOutput,
    spend_lines: list[StatementLine],
    marker: str,
) -> list[StatementSeedTransaction]:
    rows: list[StatementSeedTransaction] = []
    exact_line = spend_lines[0]
    rows.append(
        _seed_row(
            case_id=case_id,
            fixture_kind="exact_match",
            line=exact_line,
            merchant=exact_line.description,
            amount_minor=exact_line.amount_minor,
            transaction_date=exact_line.date,
            marker=marker,
        )
    )

    if len(spend_lines) >= 2:
        fuzzy_line = spend_lines[1]
        amount_delta = 1 if _amount_tolerance(fuzzy_line.amount_minor) > 1 else 0
        rows.append(
            _seed_row(
                case_id=case_id,
                fixture_kind="fuzzy_date_amount_merchant_match",
                line=fuzzy_line,
                merchant=_fuzzy_fixture_merchant(fuzzy_line.description),
                amount_minor=fuzzy_line.amount_minor + amount_delta,
                transaction_date=_shift_date(fuzzy_line.date, days=1),
                marker=marker,
            )
        )

    if len(spend_lines) >= 3:
        ambiguous_line = spend_lines[2]
        for duplicate_index in (1, 2):
            rows.append(
                _seed_row(
                    case_id=case_id,
                    fixture_kind=f"ambiguous_duplicate_match_{duplicate_index}",
                    line=ambiguous_line,
                    merchant=ambiguous_line.description,
                    amount_minor=ambiguous_line.amount_minor,
                    transaction_date=ambiguous_line.date,
                    marker=marker,
                )
            )

    receipt_only_date = _receipt_only_date(output, fallback=exact_line.date)
    rows.append(
        _seed_row(
            case_id=case_id,
            fixture_kind="receipt_only_app_transaction",
            line=None,
            merchant=f"APP ONLY TRANSACTION {case_id}",
            amount_minor=987_654_321,
            transaction_date=receipt_only_date,
            currency=output.statement.currency,
            marker=marker,
        )
    )
    rows.append(
        _seed_row(
            case_id=case_id,
            fixture_kind="near_miss_receipt_only",
            line=exact_line,
            merchant=exact_line.description,
            amount_minor=(
                exact_line.amount_minor + _amount_tolerance(exact_line.amount_minor) + 5000
            ),
            transaction_date=exact_line.date,
            marker=marker,
        )
    )
    return rows


def _seed_row(
    *,
    case_id: str,
    fixture_kind: str,
    line: StatementLine | None,
    merchant: str,
    amount_minor: int,
    transaction_date: date | None,
    marker: str,
    currency: str | None = None,
) -> StatementSeedTransaction:
    if transaction_date is None:
        raise ValueError(f"Cannot seed {fixture_kind} for {case_id}: missing transaction date")
    key = _stable_key(case_id=case_id, fixture_kind=fixture_kind, line=line)
    return StatementSeedTransaction(
        id=_stable_uuid(f"transaction.{key}"),
        item_id=_stable_uuid(f"transaction-item.{key}"),
        case_id=case_id,
        fixture_kind=fixture_kind,
        source_order=line.source_order if line is not None else None,
        transaction_date=transaction_date,
        merchant=merchant,
        total_minor=amount_minor,
        currency=currency or (line.currency if line is not None else "CLP"),
        receipt_type="scan",
        prompt_version=marker,
    )


def _stable_key(
    *,
    case_id: str,
    fixture_kind: str,
    line: StatementLine | None,
) -> str:
    source_order = line.source_order if line is not None else "app-only"
    return f"{_slug(case_id)}.{source_order}.{fixture_kind}"


def _stable_uuid(value: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, f"gastify.statement-lab-seed.{value}")


def _distinct_spend_lines(lines: list[StatementLine]) -> list[StatementLine]:
    seen: set[tuple[date | None, str, int, str]] = set()
    selected: list[StatementLine] = []
    for line in lines:
        if line.date is None or line.amount_minor <= 0:
            continue
        if line.line_type not in _STATEMENT_TRANSACTION_LINE_TYPES:
            continue
        key = (
            line.date,
            _normalize_merchant(line.description),
            line.amount_minor,
            line.currency,
        )
        if key in seen:
            continue
        seen.add(key)
        selected.append(line)
    return selected


def _fuzzy_fixture_merchant(description: str) -> str:
    words = description.split()
    if len(words) >= 2:
        return " ".join(words[:-1])
    return f"{description} fixture"


def _shift_date(value: date | None, *, days: int) -> date | None:
    return value + timedelta(days=days) if value is not None else None


def _receipt_only_date(output: StatementExtractionOutput, *, fallback: date | None) -> date:
    if output.statement.period_start is not None:
        return output.statement.period_start
    if fallback is not None:
        return fallback
    return date.today()


def _amount_tolerance(amount_minor: int) -> int:
    return max(
        1,
        math.ceil(abs(amount_minor) * settings.statement_reconciliation_amount_tolerance_ratio),
    )


def _seed_transaction_payload(row: StatementSeedTransaction) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "item_id": str(row.item_id),
        "case_id": row.case_id,
        "fixture_kind": row.fixture_kind,
        "source_order": row.source_order,
        "receipt_type": row.receipt_type,
        "prompt_version": row.prompt_version,
    }


def _normalize_merchant(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    table = str.maketrans({char: " " for char in string.punctuation})
    words = ascii_value.translate(table).casefold().split()
    ignored = {"spa", "ltda", "srl", "sa", "cl", "com", "www"}
    return " ".join(word for word in words if word not in ignored)


def _slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", value).strip("-") or "case"
