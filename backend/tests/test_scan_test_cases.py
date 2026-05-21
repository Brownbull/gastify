from unittest.mock import AsyncMock, patch

import pytest

from app.config import settings
from app.services.scan_test_cases import CATALOG, load_expected_extraction


def _enable_local_scan_test_controls(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "environment", "local")
    monkeypatch.setattr(settings, "scan_provider", "mock")
    monkeypatch.setattr(settings, "scan_test_controls_enabled", True)
    monkeypatch.setattr(settings, "scan_test_allowed_emails", [])
    monkeypatch.setattr(settings, "scan_storage_dir", str(tmp_path / "scans"))


def _enable_staging_scan_test_controls(monkeypatch, tmp_path, *, email: str):
    monkeypatch.setattr(settings, "environment", "staging")
    monkeypatch.setattr(settings, "scan_provider", "gemini")
    monkeypatch.setattr(settings, "scan_test_controls_enabled", True)
    monkeypatch.setattr(settings, "scan_test_allowed_emails", [email])
    monkeypatch.setattr(settings, "scan_storage_dir", str(tmp_path / "scans"))


def test_scan_test_case_catalog_expected_payloads_validate():
    expected_cases = [case for case in CATALOG if case.expected_path is not None]

    assert len(expected_cases) >= 6
    for case in expected_cases:
        expected = load_expected_extraction(case)
        assert expected is not None
        assert expected.merchant_name
        assert expected.currency_code
        assert expected.line_items


@pytest.mark.anyio
async def test_scan_test_cases_are_hidden_until_enabled(client, monkeypatch):
    monkeypatch.setattr(settings, "environment", "local")
    monkeypatch.setattr(settings, "scan_provider", "mock")
    monkeypatch.setattr(settings, "scan_test_controls_enabled", False)

    response = await client.get("/api/v1/scan-test-cases")

    assert response.status_code == 403


@pytest.mark.anyio
async def test_scan_test_cases_list_local_mock_cases(client, monkeypatch, tmp_path):
    _enable_local_scan_test_controls(monkeypatch, tmp_path)

    response = await client.get("/api/v1/scan-test-cases")

    assert response.status_code == 200
    data = response.json()
    assert data["environment"] == "local"
    assert data["provider"] == "mock"
    assert {case["id"] for case in data["cases"]} == {"happy", "review", "failure"}


@pytest.mark.anyio
async def test_scan_test_case_run_creates_normal_scan(client, monkeypatch, tmp_path):
    _enable_local_scan_test_controls(monkeypatch, tmp_path)

    with patch("app.api.scan_test_cases.process_scan", new_callable=AsyncMock) as process_scan:
        response = await client.post("/api/v1/scan-test-cases/happy/runs")

    assert response.status_code == 201
    data = response.json()
    assert data["test_case_id"] == "happy"
    assert data["provider"] == "mock"
    assert data["convenience_only"] is True
    assert data["original_filename"].startswith("gastify-test-case-happy-")
    process_scan.assert_awaited_once()


@pytest.mark.anyio
async def test_staging_scan_test_cases_require_allowed_user(client, monkeypatch, tmp_path):
    _enable_staging_scan_test_controls(monkeypatch, tmp_path, email="other@gastify.test")

    response = await client.get("/api/v1/scan-test-cases")

    assert response.status_code == 403


@pytest.mark.anyio
async def test_staging_scan_test_cases_expose_curated_gemini_images(
    client,
    mock_auth_context,
    monkeypatch,
    tmp_path,
):
    _enable_staging_scan_test_controls(monkeypatch, tmp_path, email=mock_auth_context.user.email)

    response = await client.get("/api/v1/scan-test-cases")

    assert response.status_code == 200
    ids = {case["id"] for case in response.json()["cases"]}
    assert "supermarket-super-lider" in ids
    assert "restaurant-2001" in ids
    assert "happy" not in ids
