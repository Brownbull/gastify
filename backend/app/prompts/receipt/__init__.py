"""Receipt scan prompt definitions."""

from app.prompts.receipt.extraction import PROMPTS as EXTRACTION_PROMPTS
from app.prompts.receipt.extraction import RECEIPT_EXTRACTION_CURRENT, RECEIPT_STRUCTURE_CURRENT
from app.prompts.receipt.item_categorization import (
    ITEM_CATEGORIZATION_CURRENT,
)
from app.prompts.receipt.item_categorization import (
    PROMPTS as ITEM_CATEGORIZATION_PROMPTS,
)
from app.prompts.receipt.store_categorization import (
    PROMPTS as STORE_CATEGORIZATION_PROMPTS,
)
from app.prompts.receipt.store_categorization import STORE_CATEGORIZATION_CURRENT

PROMPTS = (
    *EXTRACTION_PROMPTS,
    *ITEM_CATEGORIZATION_PROMPTS,
    *STORE_CATEGORIZATION_PROMPTS,
)

__all__ = [
    "ITEM_CATEGORIZATION_CURRENT",
    "PROMPTS",
    "RECEIPT_EXTRACTION_CURRENT",
    "RECEIPT_STRUCTURE_CURRENT",
    "STORE_CATEGORIZATION_CURRENT",
]
