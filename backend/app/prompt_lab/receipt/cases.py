"""Case discovery for the receipt prompt lab."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from app.prompt_lab.paths import TEST_CASES_ROOT
from app.prompt_lab.receipt.import_legacy import IMAGE_SUFFIXES

if TYPE_CHECKING:
    from pathlib import Path


@dataclass(frozen=True)
class PromptCase:
    id: str
    image_path: Path
    relative_path: str
    expected_path: Path | None = None
    fixture_path: Path | None = None
    input_path: Path | None = None
    document_type: str = "receipt"

    @property
    def baseline_path(self) -> Path | None:
        return self.expected_path or self.fixture_path

    @property
    def baseline_status(self) -> str:
        if self.expected_path:
            return "baselined"
        if self.fixture_path:
            return "fixture-baselined"
        return "unbaselined"


def list_cases(root: Path = TEST_CASES_ROOT) -> list[PromptCase]:
    if not root.exists():
        return []
    cases: list[PromptCase] = []
    image_paths = sorted(path for path in root.rglob("*") if path.suffix.lower() in IMAGE_SUFFIXES)
    for image_path in image_paths:
        rel = image_path.relative_to(root)
        case_id = rel.with_suffix("").as_posix()
        cases.append(
            PromptCase(
                id=case_id,
                image_path=image_path,
                relative_path=rel.as_posix(),
                expected_path=_first_existing(
                    image_path.with_name(f"{image_path.stem}.expected.json"),
                    image_path.with_name(f"{image_path.stem}.expected.v2.json"),
                ),
                fixture_path=_first_existing(
                    image_path.with_name(f"{image_path.stem}.fixture.json")
                ),
                input_path=_first_existing(image_path.with_name(f"{image_path.stem}.input.json")),
            )
        )
    return cases


def get_case(case_id: str, root: Path = TEST_CASES_ROOT) -> PromptCase:
    for case in list_cases(root):
        if case.id == case_id or case.relative_path == case_id:
            return case
    raise KeyError(f"Unknown prompt case: {case_id}")


def _first_existing(*paths: Path) -> Path | None:
    return next((path for path in paths if path.exists()), None)
