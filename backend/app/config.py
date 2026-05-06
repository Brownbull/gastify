from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_prefix": "GASTIFY_"}

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/gastify"
    database_echo: bool = False

    firebase_project_id: str = "boletapp-d609f"
    firebase_credentials_path: str | None = None

    fx_api_url: str = "https://api.frankfurter.dev"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174"]

    environment: str = "development"
    debug: bool = False


settings = Settings()
