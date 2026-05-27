"""Prompt registry data types."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

PromptKind = Literal[
    "receipt-extraction",
    "statement-extraction",
    "statement-layout-profile",
    "item-categorization",
    "store-categorization",
]
PromptStatus = Literal["production", "candidate", "dev-only"]


@dataclass(frozen=True)
class PromptDefinition:
    id: str
    kind: PromptKind
    name: str
    version: str
    status: PromptStatus
    system_prompt: str
    user_prompt: str | None = None
    notes: str = ""

    @property
    def text_for_hash(self) -> str:
        return f"{self.system_prompt}\n---USER---\n{self.user_prompt or ''}"
