import pytest
from pydantic import ValidationError

from app.config import Settings


def test_e2e_scan_fixtures_disabled_by_default():
    settings = Settings(
        e2e_scan_fixtures_enabled=False,
        e2e_scan_event_delay_ms=0,
    )

    assert settings.e2e_scan_fixtures_enabled is False
    assert settings.e2e_scan_event_delay_ms == 0
    assert settings.environment == "local"
    assert settings.scan_provider == "mock"
    assert settings.gemini_model == "gemini-2.5-flash-lite"


def test_e2e_scan_fixtures_forbidden_in_production():
    with pytest.raises(ValidationError, match="E2E scan fixtures cannot be enabled"):
        Settings(
            environment="production",
            e2e_scan_fixtures_enabled=True,
        )


def test_legacy_e2e_fixture_flag_selects_fixture_provider():
    settings = Settings(
        environment="staging-e2e",
        database_url="postgresql+asyncpg://postgres:postgres@localhost:5432/gastify",
        e2e_scan_fixtures_enabled=True,
        scan_test_controls_enabled=True,
        scan_test_allowed_emails=["staging-e2e@gastify.test"],
    )

    assert settings.scan_provider == "fixture"


def test_scan_provider_forbidden_in_production():
    with pytest.raises(ValidationError, match="Mock or fixture scan providers"):
        Settings(environment="production", scan_provider="mock")

    with pytest.raises(ValidationError, match="Mock or fixture scan providers"):
        Settings(environment="production", scan_provider="fixture")


def test_e2e_auth_forbidden_in_production():
    with pytest.raises(ValidationError, match="E2E auth cannot be enabled in production"):
        Settings(
            environment="production",
            database_url="postgresql+asyncpg://postgres:postgres@localhost:5432/gastify",
            scan_provider="gemini",
            e2e_auth_enabled=True,
        )


def test_sqlite_forbidden_in_deployed_environments():
    with pytest.raises(ValidationError, match="SQLite is only allowed"):
        Settings(
            environment="staging",
            database_url="sqlite+aiosqlite:///tmp/gastify.db",
            scan_provider="gemini",
        )


def test_railway_postgres_url_is_normalized_for_async_sqlalchemy():
    settings = Settings(
        environment="staging",
        database_url="postgresql://postgres:postgres@localhost:5432/gastify",
        scan_provider="gemini",
    )

    assert settings.database_url == "postgresql+asyncpg://postgres:postgres@localhost:5432/gastify"


def test_local_allows_sqlite_and_mock_provider():
    settings = Settings(
        environment="local",
        database_url="sqlite+aiosqlite:///tmp/gastify.db",
        scan_provider="mock",
    )

    assert settings.environment == "local"
    assert settings.scan_provider == "mock"


def test_local_requires_mock_provider_and_sqlite():
    with pytest.raises(
        ValidationError,
        match="local runtime requires GASTIFY_SCAN_PROVIDER=mock",
    ):
        Settings(
            environment="local",
            database_url="sqlite+aiosqlite:///tmp/gastify.db",
            scan_provider="gemini",
        )

    with pytest.raises(ValidationError, match="local runtime requires SQLite"):
        Settings(
            environment="local",
            database_url="postgresql+asyncpg://postgres:postgres@localhost:5432/gastify",
            scan_provider="mock",
        )


def test_scan_test_controls_forbidden_in_production():
    with pytest.raises(ValidationError, match="Scan test controls cannot be enabled"):
        Settings(
            environment="production",
            database_url="postgresql+asyncpg://postgres:postgres@localhost:5432/gastify",
            scan_provider="gemini",
            scan_test_controls_enabled=True,
        )


def test_staging_scan_test_controls_require_allowed_emails():
    with pytest.raises(ValidationError, match="allowed test-user emails"):
        Settings(
            environment="staging",
            database_url="postgresql+asyncpg://postgres:postgres@localhost:5432/gastify",
            scan_provider="gemini",
            scan_test_controls_enabled=True,
        )


def test_prompt_ids_are_validated_by_kind():
    with pytest.raises(ValidationError, match="not item-categorization"):
        Settings(item_categorization_prompt_id="receipt-extraction-current")

    with pytest.raises(ValidationError, match="not store-categorization"):
        Settings(store_categorization_prompt_id="item-categorization-current")


def test_dev_only_prompts_forbidden_in_production():
    with pytest.raises(ValidationError, match="Dev-only receipt extraction prompts"):
        Settings(
            environment="production",
            database_url="postgresql+asyncpg://postgres:postgres@localhost:5432/gastify",
            scan_provider="gemini",
            receipt_extraction_prompt_id="receipt-extraction-dev-scratch",
        )
