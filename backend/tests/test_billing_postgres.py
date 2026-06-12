"""PostgreSQL-executed concurrency proof for the scan-credit deduct (P16 Phase 4, D90).

The money bug (P36): the old read-check-decrement let two sessions both read 1 and both
decrement to -1. The fix is a single atomic `UPDATE ... WHERE scan_credits > 0 RETURNING`.
This drives N concurrent deducts (each its own connection) against a balance of K<N on
REAL Postgres and asserts the OBSERVABLE counter — the credit ROW ends at exactly 0 and
EXACTLY K deducts succeed (never double-spend, never negative) — not a function return
value (which would be the code reporting on itself, the Phase-1 trap).

SKIPPED unless GASTIFY_TEST_PG_DSN is set; CI provisions a Postgres service for this.
"""

from __future__ import annotations

import asyncio
import os
import uuid

import asyncpg
import pytest

PG_DSN = os.getenv("GASTIFY_TEST_PG_DSN")
pytestmark = pytest.mark.skipif(
    not PG_DSN, reason="GASTIFY_TEST_PG_DSN not set — PostgreSQL billing concurrency test skipped."
)

_TABLE = "billing_conc_test"
# D96 consume_quota shape: increment-toward-a-limit (the inverse of the old
# decrement-toward-zero; identical row-lock concurrency argument).
_CONSUME = (
    f"UPDATE {_TABLE} SET used = used + 1 "
    "WHERE ownership_scope_id = $1 AND used < $2 RETURNING used"
)


async def _connect() -> asyncpg.Connection:
    assert PG_DSN is not None
    try:
        return await asyncpg.connect(PG_DSN, timeout=5)
    except Exception:  # pragma: no cover - environment guard
        pytest.skip(f"Postgres not reachable at GASTIFY_TEST_PG_DSN ({PG_DSN.split('@')[-1]}).")


@pytest.mark.asyncio
async def test_concurrent_deducts_never_double_spend_or_go_negative() -> None:
    admin = await _connect()
    scope = uuid.uuid4()
    k_credits, n_attempts = 20, 50  # credits, concurrent attempts (attempts > credits)
    try:
        await admin.execute(
            f"CREATE TABLE IF NOT EXISTS {_TABLE} ("
            " id uuid PRIMARY KEY DEFAULT gen_random_uuid(),"
            " ownership_scope_id uuid UNIQUE NOT NULL,"
            " used integer NOT NULL DEFAULT 0)"
        )
        await admin.execute(f"DELETE FROM {_TABLE} WHERE ownership_scope_id=$1", scope)
        await admin.execute(
            f"INSERT INTO {_TABLE} (ownership_scope_id, used) VALUES ($1, 0)", scope
        )

        async def _one_deduct() -> bool:
            conn = await asyncpg.connect(PG_DSN, timeout=5)
            try:
                return await conn.fetchval(_CONSUME, scope, k_credits) is not None
            finally:
                await conn.close()

        results = await asyncio.gather(*[_one_deduct() for _ in range(n_attempts)])
        succeeded = sum(results)

        # Observable state: the ROW (not the return values).
        final = await admin.fetchval(
            f"SELECT used FROM {_TABLE} WHERE ownership_scope_id=$1", scope
        )
        assert succeeded == k_credits, (
            f"expected exactly {k_credits} consumes to win, got {succeeded}"
        )
        assert final == k_credits, f"counter went to {final} — over-consume past the limit"
    finally:
        await admin.execute(f"DELETE FROM {_TABLE} WHERE ownership_scope_id=$1", scope)
        await admin.close()
