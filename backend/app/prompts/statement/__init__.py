"""Credit-card statement prompt definitions."""

from app.prompts.statement.extraction import PROMPTS as STATEMENT_EXTRACTION_PROMPTS
from app.prompts.statement.extraction import STATEMENT_EXTRACTION_CURRENT
from app.prompts.statement.profile import PROMPTS as STATEMENT_LAYOUT_PROFILE_PROMPTS
from app.prompts.statement.profile import STATEMENT_LAYOUT_PROFILE_CURRENT

PROMPTS = (*STATEMENT_EXTRACTION_PROMPTS, *STATEMENT_LAYOUT_PROFILE_PROMPTS)

__all__ = [
    "PROMPTS",
    "STATEMENT_EXTRACTION_CURRENT",
    "STATEMENT_LAYOUT_PROFILE_CURRENT",
]
