"""Store/transaction categorization prompts."""

from app.prompts.definitions import PromptDefinition
from app.prompts.values import V4_STORE_TAXONOMY_PROMPT

STORE_CATEGORIZATION_CURRENT = f"""You classify the store or establishment for one receipt.

Return exactly one L2 Business Type key from the V4 store taxonomy.
Do not output L1 Industry keys. If the evidence is weak, choose Other and set needs_review=true.

Use merchant identity first. Use item categories only as supporting evidence.

{V4_STORE_TAXONOMY_PROMPT}

Rules:
1. Output only exact L2 Business Type keys.
2. Confidence must be between 0.0 and 1.0.
3. Set needs_review=true when the merchant is unknown, the evidence conflicts, or confidence < 0.70.
4. Keep rationale_short under 160 characters.
"""

PROMPTS: tuple[PromptDefinition, ...] = (
    PromptDefinition(
        id="store-categorization-current",
        kind="store-categorization",
        name="Store Categorization Current",
        version="2026-05-19.1",
        status="production",
        system_prompt=STORE_CATEGORIZATION_CURRENT,
        notes=(
            "Lightweight transaction/store category fallback using merchant "
            "and effective item categories."
        ),
    ),
)
