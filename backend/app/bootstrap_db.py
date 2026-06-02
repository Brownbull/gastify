"""Idempotent database bootstrap — provisions the non-superuser runtime role (P43).

Row-level security is only enforced for NON-superuser, non-BYPASSRLS roles. The
deployed app historically connected as the `postgres` superuser, so its RLS
policies were silently inert. This module ensures a dedicated, least-privilege
runtime role exists so RLS becomes a real second barrier behind the app-layer
ownership-scope filters.

Design (see app/config.py):
  - GASTIFY_DATABASE_ADMIN_URL : superuser/owner — runs THIS bootstrap + migrations.
  - GASTIFY_DATABASE_URL       : the non-superuser app role — runtime DML only.
  - GASTIFY_APP_DB_ROLE / GASTIFY_APP_DB_PASSWORD : the role this bootstrap ensures.

Runs once at startup (before alembic). Safe no-op when there is no admin URL, the
admin URL is SQLite, or the app role is unconfigured — i.e. local/dev keeps the
prior single-URL behavior untouched.
"""

from __future__ import annotations

import asyncpg
import structlog

from app.config import settings

logger = structlog.get_logger()


def _asyncpg_dsn(url: str) -> str:
    """Strip the SQLAlchemy driver suffix so asyncpg can use the DSN directly."""
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


async def ensure_app_role() -> None:
    """Ensure the non-superuser runtime role exists with least-privilege grants.

    Idempotent: safe to run on every boot. No-ops unless an admin Postgres URL and
    an app role are both configured.
    """
    admin_url = settings.database_admin_url
    role = settings.app_db_role
    password = settings.app_db_password

    if not admin_url or not admin_url.startswith("postgresql"):
        logger.info("bootstrap_db_skipped", reason="no_postgres_admin_url")
        return
    if not role or not password:
        logger.info("bootstrap_db_skipped", reason="app_db_role_unconfigured")
        return

    # Role identifiers can't be parameterized; constrain to a safe identifier so the
    # interpolation below can never inject SQL.
    if not role.replace("_", "").isalnum():
        raise ValueError(f"Unsafe app_db_role identifier: {role!r}")

    conn = await asyncpg.connect(_asyncpg_dsn(admin_url), timeout=10)
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", role)
        # Passwords can't be bind-parameterized in CREATE/ALTER ROLE (DDL). Build a
        # safely-escaped SQL string literal via Postgres' own quote_literal().
        pw_literal = await conn.fetchval("SELECT quote_literal($1::text)", password)
        if exists:
            # Keep the password in sync (env may have rotated it) — but never grant
            # SUPERUSER / BYPASSRLS, which would defeat the whole point.
            await conn.execute(
                f"ALTER ROLE {role} WITH LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD {pw_literal}"
            )
            created = False
        else:
            await conn.execute(
                f"CREATE ROLE {role} WITH LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD {pw_literal}"
            )
            created = True

        # Least privilege: connect + schema usage + table CRUD. NO DDL, NO ownership.
        # Default privileges cover tables created by FUTURE migrations (run as admin).
        await conn.execute(f"GRANT CONNECT ON DATABASE {_current_db(admin_url)} TO {role}")
        await conn.execute(f"GRANT USAGE ON SCHEMA public TO {role}")
        await conn.execute(
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {role}"
        )
        await conn.execute(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {role}")
        await conn.execute(
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
            f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {role}"
        )
        await conn.execute(
            f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {role}"
        )

        # Verify the invariant that makes RLS effective.
        is_super = await conn.fetchval(
            "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = $1", role
        )
        if is_super:
            raise RuntimeError(
                f"Runtime role {role} is superuser/bypassrls — RLS would be inert. "
                "Refusing to continue."
            )
        logger.info("bootstrap_db_app_role_ready", role=role, created=created)
    finally:
        await conn.close()


def _current_db(url: str) -> str:
    """Extract the database name from a postgres URL (last path segment, sans query)."""
    tail = url.rsplit("/", 1)[-1]
    return tail.split("?", 1)[0]


def main() -> None:
    """CLI entrypoint: `python -m app.bootstrap_db` (run before alembic on deploy)."""
    import asyncio

    asyncio.run(ensure_app_role())


if __name__ == "__main__":
    main()
