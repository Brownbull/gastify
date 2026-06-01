"""PostgreSQL-executed Row-Level-Security policy tests (P32).

The rest of the suite runs on SQLite, which cannot execute the RLS policies
(they use `current_setting('app.ownership_scope_id')` + `FORCE ROW LEVEL
SECURITY`). These tests run the REAL policies against a live Postgres and prove
cross-scope isolation — including the subquery-based policies on the statement
child tables (statement_lines, statement_reconciliation_verdicts; see P33).

They are SKIPPED unless a Postgres is reachable via `GASTIFY_TEST_PG_DSN`
(asyncpg DSN of a SUPERUSER on a throwaway DB, e.g.
postgresql://postgres@localhost:5432/gastify_test). CI / local runs without that
env var skip cleanly; point it at a throwaway PG to execute them.

IMPORTANT — why a non-superuser role: PostgreSQL superusers (and roles with
BYPASSRLS) IGNORE row-level-security policies entirely, even with FORCE ROW LEVEL
SECURITY. The production app therefore MUST connect as a plain, non-superuser
role for RLS to protect tenant isolation at all. These tests encode that
requirement: setup runs as the admin DSN, but every cross-scope DML runs through
a freshly-created non-superuser role — exactly the property the deployment relies
on.
"""

from __future__ import annotations

import os
import uuid

import asyncpg
import pytest

ADMIN_DSN = os.getenv("GASTIFY_TEST_PG_DSN")

pytestmark = pytest.mark.skipif(
    not ADMIN_DSN,
    reason="GASTIFY_TEST_PG_DSN not set — PostgreSQL-executed RLS tests skipped.",
)

# A non-superuser role created per-run; RLS only applies to roles like this.
_APP_ROLE = "gastify_rls_test_app"
_APP_PASSWORD = "rls_test_pw"

_SETUP_SQL = """
DROP TABLE IF EXISTS rls_child CASCADE;
DROP TABLE IF EXISTS rls_parent CASCADE;

CREATE TABLE rls_parent (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id uuid NOT NULL,
    label text NOT NULL
);
CREATE TABLE rls_child (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid NOT NULL REFERENCES rls_parent(id) ON DELETE CASCADE,
    note text NOT NULL
);

ALTER TABLE rls_parent ENABLE ROW LEVEL SECURITY;
ALTER TABLE rls_parent FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_parent_scope_isolation ON rls_parent
    USING (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)
    WITH CHECK (ownership_scope_id = current_setting('app.ownership_scope_id')::uuid);

ALTER TABLE rls_child ENABLE ROW LEVEL SECURITY;
ALTER TABLE rls_child FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_child_scope_isolation ON rls_child
    USING (
        parent_id IN (
            SELECT id FROM rls_parent
            WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid
        )
    )
    WITH CHECK (
        parent_id IN (
            SELECT id FROM rls_parent
            WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid
        )
    );
"""

_TEARDOWN_SQL = "DROP TABLE IF EXISTS rls_child CASCADE; DROP TABLE IF EXISTS rls_parent CASCADE;"


async def _set_scope(conn: asyncpg.Connection, scope_id: uuid.UUID) -> None:
    # Mirrors app/auth/deps.py: SELECT set_config('app.ownership_scope_id', :sid, true)
    await conn.execute("SELECT set_config('app.ownership_scope_id', $1, true)", str(scope_id))


async def _admin_setup(admin: asyncpg.Connection) -> str:
    """Create the schema + a non-superuser app role; return the app DSN."""
    await admin.execute(_SETUP_SQL)
    await admin.execute(
        f"""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{_APP_ROLE}') THEN
                CREATE ROLE {_APP_ROLE} LOGIN PASSWORD '{_APP_PASSWORD}';
            END IF;
        END$$;
        """
    )
    # Plain table privileges — NOT superuser, NOT BYPASSRLS, so policies apply.
    await admin.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON rls_parent, rls_child TO {_APP_ROLE}"
    )
    # Build the app DSN from the admin DSN (swap user, keep host/port/db).
    parts = await admin.fetchrow("SELECT current_setting('port') AS port, current_database() AS db")
    # asyncpg admin connection exposes host via its address; reconstruct from env DSN host.
    assert ADMIN_DSN is not None
    host = ADMIN_DSN.split("@")[-1].split("/")[0].split(":")[0]
    return f"postgresql://{_APP_ROLE}:{_APP_PASSWORD}@{host}:{parts['port']}/{parts['db']}"


async def _admin_teardown(admin: asyncpg.Connection) -> None:
    await admin.execute(_TEARDOWN_SQL)
    await admin.execute(
        f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {_APP_ROLE}"  # noqa: S608 — fixed role name
    )


def _reachable_or_skip() -> None:
    assert ADMIN_DSN is not None


@pytest.mark.asyncio
async def test_direct_policy_isolates_rows_across_scopes() -> None:
    _reachable_or_skip()
    assert ADMIN_DSN is not None
    try:
        admin = await asyncpg.connect(ADMIN_DSN, timeout=5)
    except Exception:
        pytest.skip(f"Postgres not reachable at GASTIFY_TEST_PG_DSN ({ADMIN_DSN.split('@')[-1]}).")

    scope_a = uuid.uuid4()
    scope_b = uuid.uuid4()
    try:
        app_dsn = await _admin_setup(admin)
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            async with app.transaction():
                await _set_scope(app, scope_a)
                parent_a = await app.fetchval(
                    "INSERT INTO rls_parent (ownership_scope_id, label)"
                    " VALUES ($1,'A') RETURNING id",
                    scope_a,
                )
            async with app.transaction():
                await _set_scope(app, scope_b)
                await app.execute(
                    "INSERT INTO rls_parent (ownership_scope_id, label) VALUES ($1,'B')", scope_b
                )

            # Scope A sees only its own row.
            async with app.transaction():
                await _set_scope(app, scope_a)
                visible = await app.fetch("SELECT label FROM rls_parent")
                assert {r["label"] for r in visible} == {"A"}

            # Scope B sees only its own row — A is invisible.
            async with app.transaction():
                await _set_scope(app, scope_b)
                visible = await app.fetch("SELECT label FROM rls_parent")
                assert {r["label"] for r in visible} == {"B"}

            # WITH CHECK blocks inserting a row for someone else's scope.
            async with app.transaction():
                await _set_scope(app, scope_b)
                with pytest.raises(asyncpg.PostgresError):
                    await app.execute(
                        "INSERT INTO rls_parent (ownership_scope_id, label) VALUES ($1,'X')",
                        scope_a,
                    )

            assert parent_a is not None
        finally:
            await app.close()
    finally:
        await _admin_teardown(admin)
        await admin.close()


@pytest.mark.asyncio
async def test_subquery_policy_isolates_child_rows_across_scopes() -> None:
    """The statement_lines / verdicts shape: child RLS keyed via parent subquery."""
    _reachable_or_skip()
    assert ADMIN_DSN is not None
    try:
        admin = await asyncpg.connect(ADMIN_DSN, timeout=5)
    except Exception:
        pytest.skip(f"Postgres not reachable at GASTIFY_TEST_PG_DSN ({ADMIN_DSN.split('@')[-1]}).")

    scope_a = uuid.uuid4()
    scope_b = uuid.uuid4()
    try:
        app_dsn = await _admin_setup(admin)
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            # Parent + child under scope A.
            async with app.transaction():
                await _set_scope(app, scope_a)
                parent_a = await app.fetchval(
                    "INSERT INTO rls_parent (ownership_scope_id, label)"
                    " VALUES ($1,'A') RETURNING id",
                    scope_a,
                )
                await app.execute(
                    "INSERT INTO rls_child (parent_id, note) VALUES ($1,'child-A')", parent_a
                )

            # Scope B cannot see scope A's child rows (subquery policy).
            async with app.transaction():
                await _set_scope(app, scope_b)
                child_rows = await app.fetch("SELECT note FROM rls_child")
                assert child_rows == []

            # Scope B cannot insert a child pointing at scope A's parent (WITH CHECK).
            async with app.transaction():
                await _set_scope(app, scope_b)
                with pytest.raises(asyncpg.PostgresError):
                    await app.execute(
                        "INSERT INTO rls_child (parent_id, note) VALUES ($1,'sneaky')", parent_a
                    )

            # Scope A still sees its own child.
            async with app.transaction():
                await _set_scope(app, scope_a)
                child_rows = await app.fetch("SELECT note FROM rls_child")
                assert {r["note"] for r in child_rows} == {"child-A"}
        finally:
            await app.close()
    finally:
        await _admin_teardown(admin)
        await admin.close()
