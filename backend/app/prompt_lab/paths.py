"""Prompt lab filesystem paths."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
PROMPT_TESTING_ROOT = REPO_ROOT / "prompt-testing"
TEST_CASES_ROOT = PROMPT_TESTING_ROOT / "test-cases" / "receipts"
CACHE_ROOT = PROMPT_TESTING_ROOT / "cache" / "gemini"
RESULTS_ROOT = PROMPT_TESTING_ROOT / "results"
LATEST_RESULTS_ROOT = RESULTS_ROOT / "latest"
ARCHIVE_RESULTS_ROOT = RESULTS_ROOT / "archive"
IMPORT_MANIFEST_PATH = PROMPT_TESTING_ROOT / "import-manifest.json"


def ensure_workspace() -> None:
    TEST_CASES_ROOT.mkdir(parents=True, exist_ok=True)
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    LATEST_RESULTS_ROOT.mkdir(parents=True, exist_ok=True)
    ARCHIVE_RESULTS_ROOT.mkdir(parents=True, exist_ok=True)
