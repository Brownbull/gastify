"""JSON repair for Gemini AI responses.

Port of BoletApp jsonRepair.ts. Gemini occasionally returns:
- Markdown code fences (```json ... ```)
- Unquoted property keys
- Single-quoted strings
- Trailing commas
- Inline comments
"""

import json
import re
from typing import Any

_MAX_INPUT_BYTES = 524_288  # 512 KB — ReDoS mitigation

_RE_LINE_COMMENT = re.compile(r"(?<!:)//[^\n]*")
_RE_BLOCK_COMMENT = re.compile(r"/\*[\s\S]*?\*/")
_RE_UNQUOTED_KEY = re.compile(r'([{,]\s*)([a-zA-Z_]\w*)\s*:')
_RE_SINGLE_QUOTED = re.compile(r"'((?:[^'\\]|\\.)*)'")
_RE_TRAILING_COMMA = re.compile(r",\s*([}\]])")


def strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` and ``` wrappers from Gemini output."""
    stripped = text.strip()
    if stripped.startswith("```"):
        first_newline = stripped.find("\n")
        if first_newline != -1:
            stripped = stripped[first_newline + 1 :]
        if stripped.endswith("```"):
            stripped = stripped[:-3]
    return stripped.strip()


def repair_json(text: str) -> str:
    """Repair known Gemini JSON malformation patterns."""
    if len(text) > _MAX_INPUT_BYTES:
        raise ValueError(f"json_repair: input exceeds {_MAX_INPUT_BYTES} byte limit")

    result = _RE_LINE_COMMENT.sub("", text)
    result = _RE_BLOCK_COMMENT.sub("", result)
    result = _RE_UNQUOTED_KEY.sub(r'\1"\2":', result)
    result = _RE_SINGLE_QUOTED.sub(_replace_single_quotes, result)
    result = _RE_TRAILING_COMMA.sub(r"\1", result)
    return result


def parse_json_with_repair(text: str) -> Any:
    """Parse JSON with automatic repair fallback.

    Tries native json.loads first. On failure, strips markdown fences
    and applies repair, then retries. Throws original error if repair fails.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    cleaned = strip_markdown_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    repaired = repair_json(cleaned)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        pass

    raise json.JSONDecodeError(
        "json_repair: all repair strategies failed",
        text,
        0,
    )


def _replace_single_quotes(match: re.Match[str]) -> str:
    content = match.group(1)
    escaped = content.replace('"', '\\"')
    cleaned = escaped.replace("\\'", "'")
    return f'"{cleaned}"'
