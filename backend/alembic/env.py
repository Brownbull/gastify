import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

import app.models  # noqa: F401 — register all models with Base.metadata
from alembic import context
from app.config import settings
from app.db import Base

config = context.config
# Migrations run as the gastify_migrator role (migration_database_url) — a
# NON-superuser that OWNS the tables, so it can run DDL + ALTER/CREATE POLICY. The
# runtime app role in database_url is a non-owner with table CRUD only, so RLS
# applies to it (P43; Gustify D32). Falls back to database_url when no migration
# URL is set (local/dev / single-role).
config.set_main_option("sqlalchemy.url", settings.migration_database_url or settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):  # type: ignore[no-untyped-def]
    # Some migrations add/validate FKs on tables that already have FORCE ROW LEVEL
    # SECURITY. When migrations run as the non-superuser owner (gastify_migrator,
    # P43), those validation scans evaluate the RLS policy, which reads
    # current_setting('app.ownership_scope_id') — unset during DDL → error. A
    # superuser silently bypassed this. Set a SESSION-level placeholder GUC so
    # policy evaluation has a value. Use `is_local=true` (3rd arg false) and run it
    # via the engine's connect event so it lands BEFORE alembic owns the
    # transaction (some migrations use autocommit_block, which asserts on the
    # alembic-managed transaction state). Postgres only; harmless on SQLite.
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def _set_migration_scope_guc(connection):  # type: ignore[no-untyped-def]
    """Set a session placeholder for app.ownership_scope_id (see do_run_migrations)."""
    if connection.dialect.name == "postgresql":
        from sqlalchemy import text

        await connection.execute(
            text("SELECT set_config('app.ownership_scope_id', :sid, false)"),
            {"sid": "00000000-0000-0000-0000-000000000000"},
        )


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        # Session-level GUC, committed outside the alembic-managed transaction so
        # it survives autocommit_block migrations (P43 migrator-role RLS).
        await _set_migration_scope_guc(connection)
        await connection.commit()
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
