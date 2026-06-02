from pydantic import Field, model_validator
from pydantic_settings import BaseSettings

from app.prompts import get_prompt, is_prompt_id_allowed

ALLOWED_ENVIRONMENTS = {
    "local",
    "staging",
    "staging-e2e",
    "production",
}
ALLOWED_SCAN_PROVIDERS = {"gemini", "fixture", "mock"}
ALLOWED_STATEMENT_PROVIDERS = {"auto", "codex-pdf-text", "fixture", "gemini"}
LOCAL_ENVIRONMENTS = {"local"}
DEPLOYED_ENVIRONMENTS = {"staging", "staging-e2e", "production"}
STAGING_ENVIRONMENTS = {"staging", "staging-e2e"}


class Settings(BaseSettings):
    model_config = {"env_prefix": "GASTIFY_"}

    database_url: str = "sqlite+aiosqlite:///../.tmp/local/gastify.db"
    database_echo: bool = False

    # P43 — RLS is only enforced for NON-superuser roles. To make row-level
    # security an effective second barrier, the RUNTIME connects via database_url
    # as a non-superuser app role, while privileged bootstrap + migrations use
    # database_admin_url (the superuser/owner). When database_admin_url is unset,
    # everything uses database_url (the prior single-URL behavior; fine for local
    # SQLite + dev). On deploy, set:
    #   GASTIFY_DATABASE_ADMIN_URL = postgres superuser URL (migrations + bootstrap)
    #   GASTIFY_DATABASE_URL       = gastify_app non-superuser URL (runtime)
    #   GASTIFY_APP_DB_ROLE / GASTIFY_APP_DB_PASSWORD = the role the bootstrap ensures
    database_admin_url: str | None = None
    app_db_role: str | None = None
    app_db_password: str | None = None

    # Audience for Firebase ID-token verification. Real envs MUST set
    # GASTIFY_FIREBASE_PROJECT_ID (gastify-staging / gastify-prod) — every
    # .env.*.example and the Railway config does. The default is a
    # non-existent local placeholder so that if the env var is ever missing,
    # token verification fails CLOSED rather than silently authenticating
    # against some other real project.
    firebase_project_id: str = "gastify-local"
    firebase_credentials_path: str | None = None
    firebase_credentials_json: str | None = None

    fx_api_url: str = "https://open.er-api.com"

    scan_storage_dir: str = "data/scans"
    statement_storage_dir: str = "data/statements"

    gemini_model: str = "gemini-2.5-flash-lite"
    gemini_max_retries: int = 3
    gemini_retry_delay_seconds: float = 2.0
    receipt_extraction_prompt_id: str = "receipt-extraction-current"
    statement_extraction_prompt_id: str = "statement-extraction-current"
    statement_layout_profile_prompt_id: str = "statement-layout-profile-current"
    item_categorization_prompt_id: str = "item-categorization-current"
    store_categorization_prompt_id: str = "store-categorization-current"

    scan_event_buffer_size: int = 32
    scan_event_heartbeat_interval_s: int = 15

    scan_provider: str = "mock"
    statement_provider: str = "auto"
    statement_reconciliation_date_tolerance_days: int = Field(default=3, ge=0, le=30)
    statement_reconciliation_amount_tolerance_ratio: float = Field(default=0.01, ge=0, le=1)
    statement_reconciliation_merchant_similarity_threshold: float = Field(
        default=0.72,
        ge=0,
        le=1,
    )
    e2e_scan_fixtures_enabled: bool = False
    e2e_scan_event_delay_ms: int = Field(default=0, ge=0, le=5_000)
    e2e_auth_enabled: bool = False
    scan_test_controls_enabled: bool = False
    scan_test_allowed_emails: list[str] = Field(default_factory=list)

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174"]

    environment: str = "local"
    debug: bool = False

    @model_validator(mode="after")
    def _normalize_and_guard_runtime_modes(self) -> "Settings":
        environment = self.environment.strip().lower()
        if environment not in ALLOWED_ENVIRONMENTS:
            raise ValueError(
                f"GASTIFY_ENVIRONMENT must be one of {', '.join(sorted(ALLOWED_ENVIRONMENTS))}"
            )
        self.environment = environment

        extraction_prompt_id = self.receipt_extraction_prompt_id.strip()
        statement_prompt_id = self.statement_extraction_prompt_id.strip()
        statement_profile_prompt_id = self.statement_layout_profile_prompt_id.strip()
        categorization_prompt_id = self.item_categorization_prompt_id.strip()
        store_prompt_id = self.store_categorization_prompt_id.strip()
        try:
            get_prompt(extraction_prompt_id, kind="receipt-extraction")
            get_prompt(statement_prompt_id, kind="statement-extraction")
            get_prompt(statement_profile_prompt_id, kind="statement-layout-profile")
            get_prompt(categorization_prompt_id, kind="item-categorization")
            get_prompt(store_prompt_id, kind="store-categorization")
        except KeyError as exc:
            raise ValueError(str(exc)) from exc
        if not is_prompt_id_allowed(
            extraction_prompt_id,
            environment=environment,
            kind="receipt-extraction",
        ):
            raise ValueError("Dev-only receipt extraction prompts cannot be enabled in production")
        if not is_prompt_id_allowed(
            statement_prompt_id,
            environment=environment,
            kind="statement-extraction",
        ):
            raise ValueError(
                "Dev-only statement extraction prompts cannot be enabled in production"
            )
        if not is_prompt_id_allowed(
            statement_profile_prompt_id,
            environment=environment,
            kind="statement-layout-profile",
        ):
            raise ValueError(
                "Dev-only statement layout profile prompts cannot be enabled in production"
            )
        if not is_prompt_id_allowed(
            categorization_prompt_id,
            environment=environment,
            kind="item-categorization",
        ):
            raise ValueError("Dev-only item categorization prompts cannot be enabled in production")
        if not is_prompt_id_allowed(
            store_prompt_id,
            environment=environment,
            kind="store-categorization",
        ):
            raise ValueError(
                "Dev-only store categorization prompts cannot be enabled in production"
            )
        self.receipt_extraction_prompt_id = extraction_prompt_id
        self.statement_extraction_prompt_id = statement_prompt_id
        self.statement_layout_profile_prompt_id = statement_profile_prompt_id
        self.item_categorization_prompt_id = categorization_prompt_id
        self.store_categorization_prompt_id = store_prompt_id

        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace(
                "postgresql://",
                "postgresql+asyncpg://",
                1,
            )
        if self.database_admin_url and self.database_admin_url.startswith("postgresql://"):
            self.database_admin_url = self.database_admin_url.replace(
                "postgresql://",
                "postgresql+asyncpg://",
                1,
            )

        scan_provider = self.scan_provider.strip().lower()
        if scan_provider not in ALLOWED_SCAN_PROVIDERS:
            raise ValueError(
                f"GASTIFY_SCAN_PROVIDER must be one of {', '.join(sorted(ALLOWED_SCAN_PROVIDERS))}"
            )
        if self.e2e_scan_fixtures_enabled and (
            environment == "staging-e2e" or scan_provider == "gemini"
        ):
            scan_provider = "fixture"
        self.scan_provider = scan_provider

        statement_provider = self.statement_provider.strip().lower()
        if statement_provider not in ALLOWED_STATEMENT_PROVIDERS:
            raise ValueError(
                "GASTIFY_STATEMENT_PROVIDER must be one of "
                f"{', '.join(sorted(ALLOWED_STATEMENT_PROVIDERS))}"
            )
        if self.e2e_scan_fixtures_enabled and environment == "staging-e2e":
            statement_provider = "fixture"
        self.statement_provider = statement_provider

        if environment == "local" and scan_provider != "mock":
            raise ValueError("local runtime requires GASTIFY_SCAN_PROVIDER=mock")
        if environment == "local" and not self.database_url.startswith("sqlite"):
            raise ValueError("local runtime requires SQLite")
        if self.e2e_scan_fixtures_enabled and environment == "production":
            raise ValueError("E2E scan fixtures cannot be enabled in production")
        if environment == "production" and scan_provider in {"fixture", "mock"}:
            raise ValueError("Mock or fixture scan providers cannot be enabled in production")
        if environment == "production" and statement_provider == "fixture":
            raise ValueError("Fixture statement provider cannot be enabled in production")
        if environment == "production" and self.e2e_auth_enabled:
            raise ValueError("E2E auth cannot be enabled in production")
        if environment == "production" and self.scan_test_controls_enabled:
            raise ValueError("Scan test controls cannot be enabled in production")
        if (
            environment in STAGING_ENVIRONMENTS
            and self.scan_test_controls_enabled
            and not self.scan_test_allowed_emails
        ):
            raise ValueError("Staging scan test controls require allowed test-user emails")
        if environment in DEPLOYED_ENVIRONMENTS and self.database_url.startswith("sqlite"):
            raise ValueError("SQLite is only allowed for local runtime")
        return self


settings = Settings()
