"""Read-only role/RLS/ownership verify for a deployed gastify DB (P16; SEV1 rehearsal tooling).
Connects via PGDSN (Railway public proxy, superuser) and reports the role split +
audit_events RLS posture + the 037 definer functions. NEVER mutates."""

import asyncio
import os

import asyncpg


async def main() -> None:
    dsn = os.environ["PGDSN"]
    c = await asyncpg.connect(dsn, timeout=20)
    try:
        ver = await c.fetchval("SELECT version_num FROM alembic_version")
        print(f"alembic_version: {ver}")

        print("\nROLES (least-privilege runtime?):")
        for r in await c.fetch(
            "SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles "
            "WHERE rolname IN ('postgres','gastify_app','gastify_migrator') ORDER BY rolname"
        ):
            print(
                f"  {r['rolname']:17} super={r['rolsuper']!s:5} "
                f"bypassrls={r['rolbypassrls']!s:5} login={r['rolcanlogin']}"
            )

        t = await c.fetchrow(
            "SELECT pg_get_userbyid(relowner) owner, relrowsecurity rls, "
            "relforcerowsecurity forced FROM pg_class WHERE relname='audit_events'"
        )
        print(
            f"\naudit_events: owner={t['owner']}  rls_enabled={t['rls']}  forced={t['forced']}"
        )
        print("  (037 expects: owner=gastify_migrator, rls=True, forced=False)")
        print("  (036/pre-037 expects: owner=gastify_migrator, rls=True, forced=True)")

        print("\nother scope-table owners (should all be gastify_migrator):")
        for o in await c.fetch(
            "SELECT relname, pg_get_userbyid(relowner) owner FROM pg_class "
            "WHERE relname IN ('transactions','ownership_scope_members','scans') ORDER BY relname"
        ):
            print(f"  {o['relname']:24} owner={o['owner']}")

        fns = await c.fetch(
            "SELECT proname, pg_get_userbyid(proowner) owner, prosecdef FROM pg_proc "
            "WHERE proname IN ('app_purge_expired_audit_events','app_count_expired_audit_events') "
            "ORDER BY proname"
        )
        print("\n037 definer functions:", "NONE (pre-037 — expected on prod until promote)" if not fns else "")
        for f in fns:
            print(f"  {f['proname']:32} owner={f['owner']} security_definer={f['prosecdef']}")
        if fns:
            ex = await c.fetchval(
                "SELECT has_function_privilege('gastify_app',"
                "'app_purge_expired_audit_events(timestamptz)','EXECUTE')"
            )
            print(f"  gastify_app has EXECUTE on the purge fn: {ex}")
    finally:
        await c.close()


asyncio.run(main())
