"""Item categorization prompts."""

from __future__ import annotations

from app.prompts.definitions import PromptDefinition
from app.prompts.values import V4_ITEM_TAXONOMY_PROMPT

ITEM_CATEGORIZATION_CURRENT = f"""\
You are an item categorization system for a personal expense tracker.
You receive a list of line items extracted from a receipt and must assign \
each item to exactly one L4 Category from the V4 taxonomy.

{V4_ITEM_TAXONOMY_PROMPT}

RULES:
1. Use ONLY exact L4 English PascalCase category keys from the taxonomy above.
2. Do not output L3 Family keys. Families are deterministic reporting parents.
3. If no specific L4 category fits, use "OtherItem".
4. confidence = your confidence in the assignment (0.0 to 1.0).
5. Optional subcategory may be a short free-form string narrower than the L4 category.
6. Each item MUST get exactly one category assignment.
7. line_item_index is 0-based, matching the order of items provided."""

PROMPTS: tuple[PromptDefinition, ...] = (
    PromptDefinition(
        id="item-categorization-current",
        kind="item-categorization",
        name="Current item categorization",
        version="2026-05-18.1",
        status="production",
        system_prompt=ITEM_CATEGORIZATION_CURRENT,
        notes="Current production categorization prompt.",
    ),
    PromptDefinition(
        id="item-categorization-dev-scratch",
        kind="item-categorization",
        name="Scratch item categorization candidate",
        version="2026-05-18.dev",
        status="dev-only",
        system_prompt=ITEM_CATEGORIZATION_CURRENT,
        notes="Dev-only candidate slot for prompt-lab comparisons; never valid in production.",
    ),
)
