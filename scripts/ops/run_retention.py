#!/usr/bin/env python3
"""Apply the data-retention policy: purge expired scan jobs + old audit events.

Scheduled operational job (cron/Railway scheduler). Defaults to a DRY RUN that
only reports counts; pass --apply to actually delete. On --apply it also makes a
best-effort cleanup of the receipt-image files of purged scans.

    python scripts/ops/run_retention.py            # dry run (counts only)
    python scripts/ops/run_retention.py --apply    # delete expired data
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


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

    # Best-effort on-disk cleanup of purged scan images (DB rows already gone).
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
