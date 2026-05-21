"""Scan provider selection for local, fixture, and Gemini runtime modes."""

from __future__ import annotations

from app.config import settings
from app.services.scan_e2e_fixtures import E2EScanFixtureCase, fixture_case_by_key
from app.services.scan_errors import ScanErrorCode

type ScanProviderName = str


def active_scan_provider(runtime_settings=settings) -> ScanProviderName:
    """Return the normalized scan provider.

    `GASTIFY_E2E_SCAN_FIXTURES_ENABLED` remains supported as a compatibility
    switch for the existing physical-device scripts, but the explicit
    `GASTIFY_SCAN_PROVIDER=fixture` flag is the new environment contract.
    """
    if getattr(runtime_settings, "e2e_scan_fixtures_enabled", False) is True:
        return "fixture"
    return getattr(runtime_settings, "scan_provider", "gemini")


def mock_case_for_scan(original_filename: str | None) -> E2EScanFixtureCase:
    """Return a deterministic local scan case.

    The mock provider is intentionally schema-backed, not stringly typed: the
    cases reuse the same Pydantic fixture payloads as the physical E2E lane.
    Filenames containing `review`/`unknown` or `failure`/`failed` select edge
    cases; every other upload becomes the happy case.
    """
    filename = (original_filename or "").strip().lower()
    if any(token in filename for token in ("failure", "failed", "invalid")):
        return fixture_case_by_key("failure") or _fallback_failure_case()
    if any(token in filename for token in ("review", "unknown", "low-confidence")):
        return fixture_case_by_key("review") or _fallback_failure_case()
    return fixture_case_by_key("happy") or _fallback_failure_case()


def _fallback_failure_case() -> E2EScanFixtureCase:
    return E2EScanFixtureCase(
        key="mock-fallback-failure",
        outcome="failure",
        failure_code=ScanErrorCode.UNKNOWN_ERROR.value,
        failure_message="Mock scan provider fixture payload is unavailable",
    )
