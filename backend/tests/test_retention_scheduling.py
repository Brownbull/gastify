"""Exit-signal-(d) config guard: the retention purge is actually SCHEDULED.

The retention machinery (retention.py + run_retention.py) is useless unless something
invokes it on a recurring schedule — the P16 Phase-2 review found it was an orphan
(railway.toml ran only alembic+uvicorn). This pins the scheduled GitHub Actions
workflow so a future change that drops the cron, or stops calling --apply, fails CI.
A config-presence guard, not a runtime DB assertion.
"""

from __future__ import annotations

from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
_WORKFLOW = _REPO_ROOT / ".github" / "workflows" / "retention.yml"


def test_retention_workflow_exists() -> None:
    assert _WORKFLOW.is_file(), f"missing scheduled retention workflow at {_WORKFLOW}"


def test_retention_workflow_runs_on_a_recurring_schedule() -> None:
    text = _WORKFLOW.read_text(encoding="utf-8")
    assert "schedule:" in text, "retention workflow has no schedule trigger"
    assert "cron:" in text, "retention workflow schedule has no cron expression"


def test_retention_workflow_invokes_the_apply_runner() -> None:
    text = _WORKFLOW.read_text(encoding="utf-8")
    assert "run_retention.py --apply" in text, (
        "the scheduled retention workflow must invoke run_retention.py --apply "
        "(otherwise expired data is never deleted)"
    )
