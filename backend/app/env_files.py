"""Local dotenv loading helpers.

Only ignored local files are read. Production dotenv files are intentionally not
part of the default search path.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import dotenv_values

BACKEND_ROOT = Path(__file__).resolve().parents[1]
FULL_DEFAULT_ENV_FILES = (".env", ".env.local")
SECRET_FALLBACK_ENV_FILES = (".env.staging", ".env.staging-e2e")
SECRET_FALLBACK_KEYS = frozenset({"GOOGLE_API_KEY"})


@dataclass(frozen=True)
class EnvLoadReport:
    loaded_files: tuple[Path, ...]
    loaded_keys: tuple[str, ...]


def load_backend_env_files(
    *,
    root: Path = BACKEND_ROOT,
    explicit_file: str | Path | None = None,
) -> EnvLoadReport:
    """Load local backend env files without printing or returning values.

    Default behavior:
    - fully load `.env` and `.env.local` when present;
    - if `GOOGLE_API_KEY` is still missing, load only that key from staging files;
    - never auto-load production secrets.

    Set `GASTIFY_PROMPT_LAB_ENV_FILE=/path/to/file` for an explicit full env file.
    """

    loaded_files: list[Path] = []
    loaded_keys: list[str] = []
    explicit = explicit_file or os.environ.get("GASTIFY_PROMPT_LAB_ENV_FILE")

    if explicit:
        path = _resolve_env_path(explicit, root=root)
        keys = _load_env_values(path)
        if keys:
            loaded_files.append(path)
            loaded_keys.extend(keys)
        return EnvLoadReport(tuple(loaded_files), tuple(sorted(set(loaded_keys))))

    for filename in FULL_DEFAULT_ENV_FILES:
        path = root / filename
        keys = _load_env_values(path)
        if keys:
            loaded_files.append(path)
            loaded_keys.extend(keys)

    if not os.environ.get("GOOGLE_API_KEY"):
        for filename in SECRET_FALLBACK_ENV_FILES:
            path = root / filename
            keys = _load_env_values(path, allowed_keys=SECRET_FALLBACK_KEYS)
            if keys:
                loaded_files.append(path)
                loaded_keys.extend(keys)
            if os.environ.get("GOOGLE_API_KEY"):
                break

    return EnvLoadReport(tuple(loaded_files), tuple(sorted(set(loaded_keys))))


def _load_env_values(
    path: Path,
    *,
    allowed_keys: frozenset[str] | None = None,
) -> list[str]:
    if not path.exists():
        return []

    loaded: list[str] = []
    for key, value in dotenv_values(path).items():
        if not key or value is None or value == "":
            continue
        if allowed_keys is not None and key not in allowed_keys:
            continue
        if os.environ.get(key):
            continue
        os.environ[key] = value
        loaded.append(key)
    return loaded


def _resolve_env_path(path: str | Path, *, root: Path) -> Path:
    candidate = Path(path).expanduser()
    if candidate.is_absolute():
        return candidate
    root_relative = root / candidate
    if root_relative.exists():
        return root_relative
    return Path.cwd() / candidate
