import os

from app.env_files import load_backend_env_files


def test_load_backend_env_files_uses_staging_only_as_secret_fallback(tmp_path, monkeypatch):
    (tmp_path / ".env.local").write_text(
        "\n".join(
            [
                "GASTIFY_ENVIRONMENT=local",
                "GASTIFY_GEMINI_MODEL=local-model",
                "GOOGLE_API_KEY=",
            ]
        ),
        encoding="utf-8",
    )
    (tmp_path / ".env.staging").write_text(
        "\n".join(
            [
                "GASTIFY_ENVIRONMENT=staging",
                "GASTIFY_GEMINI_MODEL=staging-model",
                "GOOGLE_API_KEY=staging-secret",
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.delenv("GASTIFY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("GASTIFY_GEMINI_MODEL", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    report = load_backend_env_files(root=tmp_path)

    assert os.environ["GASTIFY_ENVIRONMENT"] == "local"
    assert os.environ["GASTIFY_GEMINI_MODEL"] == "local-model"
    assert os.environ["GOOGLE_API_KEY"] == "staging-secret"
    assert "GOOGLE_API_KEY" in report.loaded_keys
    for key in ("GASTIFY_ENVIRONMENT", "GASTIFY_GEMINI_MODEL", "GOOGLE_API_KEY"):
        os.environ.pop(key, None)


def test_load_backend_env_files_never_overrides_existing_secret(tmp_path, monkeypatch):
    (tmp_path / ".env.staging").write_text("GOOGLE_API_KEY=file-secret\n", encoding="utf-8")
    monkeypatch.setenv("GOOGLE_API_KEY", "existing-secret")

    load_backend_env_files(root=tmp_path)

    assert os.environ["GOOGLE_API_KEY"] == "existing-secret"


def test_explicit_prompt_lab_env_file_loads_full_file(tmp_path, monkeypatch):
    env_file = tmp_path / "prompt-lab.env"
    env_file.write_text(
        "\n".join(
            [
                "GASTIFY_ENVIRONMENT=staging",
                "GOOGLE_API_KEY=explicit-secret",
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.delenv("GASTIFY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    load_backend_env_files(root=tmp_path, explicit_file=env_file)

    assert os.environ["GASTIFY_ENVIRONMENT"] == "staging"
    assert os.environ["GOOGLE_API_KEY"] == "explicit-secret"
    for key in ("GASTIFY_ENVIRONMENT", "GOOGLE_API_KEY"):
        os.environ.pop(key, None)
