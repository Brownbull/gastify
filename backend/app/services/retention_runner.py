"""CLI entrypoint for the scheduled data-retention purge (P16 Phase 2, exit signal d).

Lives inside the backend package so it ships in the deployed image (the Dockerfile
copies only `backend/`), which is what lets a Railway cron service — or the GitHub
Action — invoke it identically:

    python -m app.services.retention_runner            # dry run (counts only)
    python -m app.services.retention_runner --apply    # delete expired data

Defaults to a DRY RUN. On --apply it purges expired scan rows + non-DSR audit events
(the audit purge routes through the migrator-owned SECURITY DEFINER on Postgres) and
makes a best-effort cleanup of the purged scans' receipt-image files. Connects via the
least-privilege `gastify_app` runtime role; the definer does the privileged work.
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import UTC, datetime
from pathlib import Path


async def _run(apply: bool) -> int:
    from app.db import async_session
    from app.services.retention import apply_retention, count_expired

    now = datetime.now(UTC)
    async with async_session() as db:
        if not apply:
            scans, audit = await count_expired(db, now=now)
            print(f"[dry-run] would purge: {scans} scan(s), {audit} audit event(s)")
            print("Pass --apply to delete.")
            return 0

        result = await apply_retention(db, now=now)

    # Best-effort on-disk cleanup of purged scan images (DB rows already gone). Scan
    # storage is ephemeral in the deployed envs, so a missing file is the normal case.
    removed_files = 0
    for image_path in result.scan_image_paths:
        try:
            Path(image_path).unlink(missing_ok=True)
            removed_files += 1
        except OSError as exc:  # noqa: PERF203 - per-file best effort
            print(f"  warn: could not remove {image_path}: {exc}")

    print(
        f"[applied] purged {result.scans_deleted} scan(s) "
        f"({removed_files} image file(s) removed), "
        f"{result.audit_events_deleted} audit event(s)"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply Gastify data-retention policy.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually delete expired data (default is a dry run).",
    )
    args = parser.parse_args()
    return asyncio.run(_run(apply=args.apply))


if __name__ == "__main__":
    raise SystemExit(main())
