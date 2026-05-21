from pathlib import Path

from app.services.scan_e2e_fixtures import (
    E2E_SCAN_FIXTURE_HASHES,
    UPLOAD_HASH_MARKER_FILENAME,
    fixture_case_by_key,
    fixture_case_for_hash,
    fixture_case_for_scan_image,
    upload_sha256,
    write_upload_hash_marker,
)


def test_fixture_hashes_resolve_known_cases():
    assert fixture_case_for_hash(E2E_SCAN_FIXTURE_HASHES["happy"]).key == "happy"
    assert fixture_case_for_hash(E2E_SCAN_FIXTURE_HASHES["happy_android_picker_s23"]).key == "happy"
    assert fixture_case_for_hash(E2E_SCAN_FIXTURE_HASHES["review"]).key == "review"
    assert (
        fixture_case_for_hash(E2E_SCAN_FIXTURE_HASHES["review_android_picker_s23"]).key == "review"
    )
    assert fixture_case_for_hash(E2E_SCAN_FIXTURE_HASHES["failure"]).key == "failure"
    assert (
        fixture_case_for_hash(E2E_SCAN_FIXTURE_HASHES["failure_android_picker_s23"]).key
        == "failure"
    )
    assert fixture_case_for_hash("not-a-known-hash") is None


def test_fixture_cases_resolve_by_key():
    assert fixture_case_by_key("happy").key == "happy"
    assert fixture_case_by_key("review").key == "review"
    assert fixture_case_by_key("failure").key == "failure"
    assert fixture_case_by_key("missing") is None


def test_upload_marker_records_raw_bytes_when_enabled(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "app.services.scan_e2e_fixtures.settings.e2e_scan_fixtures_enabled",
        True,
    )
    raw = b"raw-upload-bytes"

    write_upload_hash_marker(tmp_path, raw)

    marker = tmp_path / UPLOAD_HASH_MARKER_FILENAME
    assert marker.read_text(encoding="utf-8").strip() == upload_sha256(raw)


def test_upload_marker_records_raw_bytes_for_mock_provider(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "app.services.scan_e2e_fixtures.settings.e2e_scan_fixtures_enabled",
        False,
    )
    monkeypatch.setattr("app.services.scan_e2e_fixtures.settings.scan_provider", "mock")
    raw = b"raw-upload-bytes"

    write_upload_hash_marker(tmp_path, raw)

    marker = tmp_path / UPLOAD_HASH_MARKER_FILENAME
    assert marker.read_text(encoding="utf-8").strip() == upload_sha256(raw)


def test_scan_image_lookup_uses_sidecar_hash_marker(tmp_path):
    marker = tmp_path / UPLOAD_HASH_MARKER_FILENAME
    image_path = tmp_path / "receipt.jpg"
    image_path.write_bytes(b"compressed-image")
    marker.write_text(f"{E2E_SCAN_FIXTURE_HASHES['happy']}\n", encoding="utf-8")

    assert fixture_case_for_scan_image(Path(image_path)).key == "happy"
