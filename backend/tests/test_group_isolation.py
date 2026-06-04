"""PostgreSQL-executed group-isolation tests (Phase 5 / D70) — the CRITICAL gate.

These prove the security-load-bearing property of the group scope-swap under REAL
row-level security: "user A cannot read group B" (D69). They run the actual
`app_is_scope_member` oracle shape (migration 028) and the real members/
transactions RLS policy shape (003/027) against a live Postgres, through a
NON-superuser app role — because superusers and BYPASSRLS roles ignore RLS, a
leak would falsely pass on SQLite or as a superuser.

Crucially the oracle is owned by a NON-superuser OWNER role (mirroring
`gastify_migrator`). A SECURITY DEFINER function owned by a superuser would bypass
RLS regardless of its body, so it could "pass" even if the function forgot to set
the GUC — owning it as a non-superuser is what makes this test able to catch that
bug. The function must therefore set the target GUC for its own read and restore
the caller's GUC afterward (the confinement property test D asserts).

SKIPPED unless `GASTIFY_TEST_PG_DSN` (asyncpg DSN of a SUPERUSER on a throwaway
DB) is set; CI provisions a Postgres service for this (see .github/workflows).

Keep the function + policy DDL below in sync with migration 028 / 003 / 027.
"""

from __future__ import annotations

import os
import uuid

import asyncpg
import pytest

ADMIN_DSN = os.getenv("GASTIFY_TEST_PG_DSN")

pytestmark = pytest.mark.skipif(
    not ADMIN_DSN,
    reason="GASTIFY_TEST_PG_DSN not set — PostgreSQL-executed group-isolation tests skipped.",
)

_APP_ROLE = "gastify_grp_test_app"  # non-superuser caller (mirrors gastify_app)
_OWNER_ROLE = "gastify_grp_test_owner"  # non-superuser owner of tables + oracle (mirrors migrator)
_APP_PASSWORD = "grp_test_pw"  # noqa: S105 — throwaway test role password

# missing_ok + NULLIF('') fail-safe form, mirrors migration 027.
_SCOPE = "NULLIF(current_setting('app.ownership_scope_id', true), '')::uuid"

# Mirrors migration 028 _CREATE_ORACLE (save → elevate-to-target → read → restore).
_CREATE_ORACLE = """
CREATE OR REPLACE FUNCTION app_is_scope_member(p_user_id uuid, p_scope_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_prev text;
    v_found boolean;
BEGIN
    IF p_user_id IS NULL OR p_scope_id IS NULL THEN
        RETURN false;
    END IF;
    v_prev := current_setting('app.ownership_scope_id', true);
    PERFORM set_config('app.ownership_scope_id', p_scope_id::text, true);
    SELECT EXISTS (
        SELECT 1 FROM ownership_scope_members
        WHERE user_id = p_user_id AND ownership_scope_id = p_scope_id
    ) INTO v_found;
    PERFORM set_config('app.ownership_scope_id', COALESCE(v_prev, ''), true);
    RETURN v_found;
END;
$$;
"""

# app_user_groups / app_group_invite_preview mirror migration 029 — cross-scope
# readers that rely on the members table being ENABLE-but-NOT-FORCE (D71), so the
# migrator-owned owner role can read membership across scopes.
_CREATE_USER_GROUPS = """
CREATE OR REPLACE FUNCTION app_user_groups(p_user_id uuid)
RETURNS TABLE(scope_id uuid, group_name text, member_role text, member_count integer)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN;
    END IF;
    RETURN QUERY
    SELECT s.id, s.name, m.role,
           (SELECT count(*)::integer FROM ownership_scope_members m2
            WHERE m2.ownership_scope_id = s.id)
    FROM ownership_scope_members m
    JOIN ownership_scopes s ON s.id = m.ownership_scope_id
    WHERE m.user_id = p_user_id AND s.scope_type = 'group'
    ORDER BY s.created_at;
END;
$$;
"""

_CREATE_INVITE_PREVIEW = """
CREATE OR REPLACE FUNCTION app_group_invite_preview(p_token text)
RETURNS TABLE(group_id uuid, group_name text, member_count integer, expires_at timestamptz)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
    IF p_token IS NULL OR length(p_token) = 0 THEN
        RETURN;
    END IF;
    RETURN QUERY
    SELECT s.id, s.name,
           (SELECT count(*)::integer FROM ownership_scope_members m
            WHERE m.ownership_scope_id = s.id),
           s.invite_token_expires_at
    FROM ownership_scopes s
    WHERE s.invite_token = p_token AND s.scope_type = 'group';
END;
$$;
"""

_SETUP_SQL = f"""
DROP TABLE IF EXISTS grp_transactions CASCADE;
DROP TABLE IF EXISTS ownership_scope_members CASCADE;
DROP TABLE IF EXISTS ownership_scopes CASCADE;

CREATE TABLE ownership_scopes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    scope_type text NOT NULL DEFAULT 'group',
    invite_token text,
    invite_token_expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ownership_scope_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL DEFAULT 'owner',
    UNIQUE (ownership_scope_id, user_id)
);
CREATE TABLE grp_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id uuid NOT NULL,
    label text NOT NULL
);

-- ownership_scopes has NO RLS in prod (it's the scope anchor). The members table
-- is ENABLE-but-NOT-FORCE (D71): RLS binds the non-owner app role, but the
-- migrator-owned owner role (which backs the SECURITY DEFINER readers) is exempt,
-- enabling controlled cross-scope membership reads.
ALTER TABLE ownership_scope_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY ownership_scope_members_scope_isolation ON ownership_scope_members
    USING (ownership_scope_id = {_SCOPE})
    WITH CHECK (ownership_scope_id = {_SCOPE});

-- DATA tables keep FORCE — owner is bound too.
ALTER TABLE grp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grp_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY grp_transactions_scope_isolation ON grp_transactions
    USING (ownership_scope_id = {_SCOPE})
    WITH CHECK (ownership_scope_id = {_SCOPE});

ALTER TABLE ownership_scopes OWNER TO {_OWNER_ROLE};
ALTER TABLE ownership_scope_members OWNER TO {_OWNER_ROLE};
ALTER TABLE grp_transactions OWNER TO {_OWNER_ROLE};
"""

_FUNCTIONS = (
    "app_is_scope_member(uuid, uuid)",
    "app_user_groups(uuid)",
    "app_group_invite_preview(text)",
)

_TEARDOWN_SQL = (
    "DROP TABLE IF EXISTS grp_transactions CASCADE;"
    " DROP TABLE IF EXISTS ownership_scope_members CASCADE;"
    " DROP TABLE IF EXISTS ownership_scopes CASCADE;"
    " DROP FUNCTION IF EXISTS app_is_scope_member(uuid, uuid);"
    " DROP FUNCTION IF EXISTS app_user_groups(uuid);"
    " DROP FUNCTION IF EXISTS app_group_invite_preview(text);"
)


async def _set_scope(conn: asyncpg.Connection, scope_id: uuid.UUID) -> None:
    await conn.execute("SELECT set_config('app.ownership_scope_id', $1, true)", str(scope_id))


async def _current_scope(conn: asyncpg.Connection) -> str | None:
    return await conn.fetchval("SELECT current_setting('app.ownership_scope_id', true)")


async def _is_member(conn: asyncpg.Connection, user_id: uuid.UUID, scope_id: uuid.UUID) -> bool:
    return bool(await conn.fetchval("SELECT app_is_scope_member($1, $2)", user_id, scope_id))


async def _resolve_then_query_labels(
    conn: asyncpg.Connection, *, personal: uuid.UUID, user_id: uuid.UUID, group_id: uuid.UUID
) -> set[str]:
    """Mirror resolve_analytics_scope under real RLS: validate, swap ONLY on success,
    then read. Returns the set of transaction labels visible after resolution."""
    await _set_scope(conn, personal)
    if await _is_member(conn, user_id, group_id):
        await _set_scope(conn, group_id)  # swap reachable only when membership proved
    rows = await conn.fetch("SELECT label FROM grp_transactions")
    return {r["label"] for r in rows}


async def _admin_setup(admin: asyncpg.Connection) -> str:
    for role in (_OWNER_ROLE, _APP_ROLE):
        await admin.execute(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN
                    CREATE ROLE {role} NOSUPERUSER;
                END IF;
            END$$;
            """
        )
    # The caller role logs in; the owner role never connects (it backs the DEFINER).
    await admin.execute(f"ALTER ROLE {_APP_ROLE} LOGIN PASSWORD '{_APP_PASSWORD}'")
    await admin.execute(_SETUP_SQL)
    for ddl in (_CREATE_ORACLE, _CREATE_USER_GROUPS, _CREATE_INVITE_PREVIEW):
        await admin.execute(ddl)
    for fn in _FUNCTIONS:
        await admin.execute(f"ALTER FUNCTION {fn} OWNER TO {_OWNER_ROLE}")
        await admin.execute(f"REVOKE ALL ON FUNCTION {fn} FROM PUBLIC")
        await admin.execute(f"GRANT EXECUTE ON FUNCTION {fn} TO {_APP_ROLE}")
    await admin.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON ownership_scopes, ownership_scope_members,"
        f" grp_transactions TO {_APP_ROLE}"
    )
    parts = await admin.fetchrow("SELECT current_setting('port') AS port, current_database() AS db")
    assert ADMIN_DSN is not None
    host = ADMIN_DSN.split("@")[-1].split("/")[0].split(":")[0]
    return f"postgresql://{_APP_ROLE}:{_APP_PASSWORD}@{host}:{parts['port']}/{parts['db']}"


async def _admin_teardown(admin: asyncpg.Connection) -> None:
    await admin.execute(_TEARDOWN_SQL)
    await admin.execute(
        f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {_APP_ROLE}"  # noqa: S608 — fixed role
    )


async def _connect_admin() -> asyncpg.Connection:
    assert ADMIN_DSN is not None
    try:
        return await asyncpg.connect(ADMIN_DSN, timeout=5)
    except Exception:  # pragma: no cover - environment guard
        pytest.skip(f"Postgres not reachable at GASTIFY_TEST_PG_DSN ({ADMIN_DSN.split('@')[-1]}).")


async def _seed_group_with_member_and_txn(
    app: asyncpg.Connection, *, group_id: uuid.UUID, member_id: uuid.UUID, label: str
) -> None:
    """Create a membership row + a transaction in the group scope (GUC swapped to it)."""
    async with app.transaction():
        await _set_scope(app, group_id)
        await app.execute(
            "INSERT INTO ownership_scope_members (ownership_scope_id, user_id, role)"
            " VALUES ($1, $2, 'owner')",
            group_id,
            member_id,
        )
        await app.execute(
            "INSERT INTO grp_transactions (ownership_scope_id, label) VALUES ($1, $2)",
            group_id,
            label,
        )


# --- A: the CRITICAL "user A cannot read group B's tree" gate ---


@pytest.mark.asyncio
async def test_member_reads_group_nonmember_sees_zero_rows() -> None:
    admin = await _connect_admin()
    user_a, user_b = uuid.uuid4(), uuid.uuid4()
    personal_a, personal_b, group_g = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    try:
        app_dsn = await _admin_setup(admin)
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            await _seed_group_with_member_and_txn(
                app, group_id=group_g, member_id=user_a, label="GROUP-G-TXN"
            )
            # Member A: validation passes → swap → sees the group's row.
            async with app.transaction():
                labels_a = await _resolve_then_query_labels(
                    app, personal=personal_a, user_id=user_a, group_id=group_g
                )
                assert labels_a == {"GROUP-G-TXN"}
            # Non-member B: validation fails → NO swap → ZERO group rows. THE gate.
            async with app.transaction():
                labels_b = await _resolve_then_query_labels(
                    app, personal=personal_b, user_id=user_b, group_id=group_g
                )
                assert labels_b == set()
        finally:
            await app.close()
    finally:
        await _admin_teardown(admin)
        await admin.close()


# --- B: validate-then-swap ordering — a non-member never points the GUC at G ---


@pytest.mark.asyncio
async def test_nonmember_request_never_points_guc_at_group() -> None:
    admin = await _connect_admin()
    user_a, user_b = uuid.uuid4(), uuid.uuid4()
    personal_b, group_g = uuid.uuid4(), uuid.uuid4()
    try:
        app_dsn = await _admin_setup(admin)
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            await _seed_group_with_member_and_txn(
                app, group_id=group_g, member_id=user_a, label="GROUP-G-TXN"
            )
            async with app.transaction():
                await _set_scope(app, personal_b)
                is_member = await _is_member(app, user_b, group_g)
                assert is_member is False  # B is not a member
                # The swap is unreachable (guarded by is_member); GUC stays personal_b.
                assert await _current_scope(app) == str(personal_b)
                rows = await app.fetch("SELECT label FROM grp_transactions")
                assert rows == []  # no group rows leak even though G has a txn
        finally:
            await app.close()
    finally:
        await _admin_teardown(admin)
        await admin.close()


# --- C: revocation — a removed member's next request sees no group data ---


@pytest.mark.asyncio
async def test_revoked_member_sees_no_group_data() -> None:
    admin = await _connect_admin()
    owner_a, member_c = uuid.uuid4(), uuid.uuid4()
    personal_c, group_g = uuid.uuid4(), uuid.uuid4()
    try:
        app_dsn = await _admin_setup(admin)
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            await _seed_group_with_member_and_txn(
                app, group_id=group_g, member_id=owner_a, label="GROUP-G-TXN"
            )
            # Add C as a member, then prove C can read.
            async with app.transaction():
                await _set_scope(app, group_g)
                await app.execute(
                    "INSERT INTO ownership_scope_members (ownership_scope_id, user_id, role)"
                    " VALUES ($1, $2, 'member')",
                    group_g,
                    member_c,
                )
            async with app.transaction():
                labels = await _resolve_then_query_labels(
                    app, personal=personal_c, user_id=member_c, group_id=group_g
                )
                assert labels == {"GROUP-G-TXN"}  # baseline: C is in
            # Revoke C (delete the membership row under the group GUC).
            async with app.transaction():
                await _set_scope(app, group_g)
                await app.execute(
                    "DELETE FROM ownership_scope_members WHERE user_id = $1 AND ownership_scope_id"
                    " = $2",
                    member_c,
                    group_g,
                )
            # C's next request now fails validation → no swap → no data.
            async with app.transaction():
                labels_after = await _resolve_then_query_labels(
                    app, personal=personal_c, user_id=member_c, group_id=group_g
                )
                assert labels_after == set()
        finally:
            await app.close()
    finally:
        await _admin_teardown(admin)
        await admin.close()


# --- D: chicken-and-egg — the oracle validates a member under their PERSONAL GUC,
#        and restores it (confinement) so it never silently performs the swap ---


@pytest.mark.asyncio
async def test_oracle_validates_member_under_personal_guc_and_confines() -> None:
    admin = await _connect_admin()
    member_a, stranger_b = uuid.uuid4(), uuid.uuid4()
    personal_a, group_g = uuid.uuid4(), uuid.uuid4()
    try:
        app_dsn = await _admin_setup(admin)
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            await _seed_group_with_member_and_txn(
                app, group_id=group_g, member_id=member_a, label="GROUP-G-TXN"
            )
            async with app.transaction():
                await _set_scope(app, personal_a)
                # A legit member is recognised DESPITE the members-table RLS hiding
                # the row under the personal GUC (the chicken-and-egg resolved).
                assert await _is_member(app, member_a, group_g) is True
                # A non-member is rejected (the oracle is not over-broad).
                assert await _is_member(app, stranger_b, group_g) is False
                # Confinement: the oracle restored the caller's GUC — it did NOT
                # leave the session pointing at the group it just inspected.
                assert await _current_scope(app) == str(personal_a)
                # Proof of confinement: a direct read still sees ZERO group rows,
                # because the GUC is still personal_a, not group_g.
                assert await app.fetch("SELECT label FROM grp_transactions") == []
        finally:
            await app.close()
    finally:
        await _admin_teardown(admin)
        await admin.close()


async def _seed_group_row(
    app: asyncpg.Connection,
    *,
    group_id: uuid.UUID,
    name: str,
    members: list[tuple[uuid.UUID, str]],
    token: str | None = None,
) -> None:
    """Insert a group scope (no RLS) + its member rows (under the group GUC)."""
    async with app.transaction():
        await app.execute(
            "INSERT INTO ownership_scopes (id, name, scope_type, invite_token)"
            " VALUES ($1, $2, 'group', $3)",
            group_id,
            name,
            token,
        )
        await _set_scope(app, group_id)
        for user_id, role in members:
            await app.execute(
                "INSERT INTO ownership_scope_members (ownership_scope_id, user_id, role)"
                " VALUES ($1, $2, $3)",
                group_id,
                user_id,
                role,
            )


# --- E: NO-FORCE (D71) must NOT expose members across scopes to the app role ---


@pytest.mark.asyncio
async def test_app_role_member_reads_isolated_under_no_force() -> None:
    admin = await _connect_admin()
    user_a, user_b = uuid.uuid4(), uuid.uuid4()
    group_a, group_b = uuid.uuid4(), uuid.uuid4()
    try:
        app_dsn = await _admin_setup(admin)
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            await _seed_group_row(app, group_id=group_a, name="A", members=[(user_a, "owner")])
            await _seed_group_row(app, group_id=group_b, name="B", members=[(user_b, "owner")])
            # Dropping FORCE relaxes only the OWNER; the non-owner app role is still
            # RLS-bound, so a direct members read sees only the current scope's rows.
            async with app.transaction():
                await _set_scope(app, group_a)
                rows = await app.fetch("SELECT ownership_scope_id FROM ownership_scope_members")
                assert {r["ownership_scope_id"] for r in rows} == {group_a}
            async with app.transaction():
                await _set_scope(app, group_b)
                rows = await app.fetch("SELECT ownership_scope_id FROM ownership_scope_members")
                assert {r["ownership_scope_id"] for r in rows} == {group_b}
        finally:
            await app.close()
    finally:
        await _admin_teardown(admin)
        await admin.close()


# --- F: app_user_groups returns only the PASSED user's groups, across scopes ---


@pytest.mark.asyncio
async def test_app_user_groups_returns_only_callers_groups() -> None:
    admin = await _connect_admin()
    user_a, user_b = uuid.uuid4(), uuid.uuid4()
    group1, group2 = uuid.uuid4(), uuid.uuid4()
    try:
        app_dsn = await _admin_setup(admin)
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            await _seed_group_row(
                app, group_id=group1, name="One", members=[(user_a, "owner"), (user_b, "member")]
            )
            await _seed_group_row(app, group_id=group2, name="Two", members=[(user_b, "owner")])
            # GUC pointed at neither group — the reader is GUC-independent (cross-scope).
            await _set_scope(app, uuid.uuid4())
            a_rows = await app.fetch(
                "SELECT scope_id, member_count FROM app_user_groups($1)", user_a
            )
            assert {r["scope_id"] for r in a_rows} == {group1}
            assert a_rows[0]["member_count"] == 2
            b_rows = await app.fetch("SELECT scope_id FROM app_user_groups($1)", user_b)
            assert {r["scope_id"] for r in b_rows} == {group1, group2}
        finally:
            await app.close()
    finally:
        await _admin_teardown(admin)
        await admin.close()


# --- G: app_group_invite_preview resolves a token for a not-yet-member ---


@pytest.mark.asyncio
async def test_invite_preview_resolves_token_cross_scope() -> None:
    admin = await _connect_admin()
    owner, group_g = uuid.uuid4(), uuid.uuid4()
    try:
        app_dsn = await _admin_setup(admin)
        app = await asyncpg.connect(app_dsn, timeout=5)
        try:
            await _seed_group_row(
                app, group_id=group_g, name="Casa", members=[(owner, "owner")], token="tok-123"
            )
            await _set_scope(app, uuid.uuid4())  # bearer is NOT a member, GUC elsewhere
            row = await app.fetchrow(
                "SELECT group_id, group_name, member_count FROM app_group_invite_preview($1)",
                "tok-123",
            )
            assert row is not None
            assert row["group_id"] == group_g
            assert row["group_name"] == "Casa"
            assert row["member_count"] == 1
            # Unknown token → empty result.
            assert (
                await app.fetchrow("SELECT group_id FROM app_group_invite_preview($1)", "nope")
            ) is None
        finally:
            await app.close()
    finally:
        await _admin_teardown(admin)
        await admin.close()
