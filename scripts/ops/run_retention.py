#!/usr/bin/env python3
"""Repo-root shim for the data-retention runner (local/dev convenience).

The real entrypoint lives IN the backend package — `app.services.retention_runner` —
so it ships in the deployed image (the Dockerfile copies only `backend/`). Deployed
schedulers (the Railway cron service + the GitHub Action) invoke it as
`python -m app.services.retention_runner [--apply]`. This shim lets you run it from the
repo root locally without setting PYTHONPATH:

    python scripts/ops/run_retention.py            # dry run
    python scripts/ops/run_retention.py --apply    # delete expired data
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.retention_runner import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
