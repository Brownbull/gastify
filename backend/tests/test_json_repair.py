"""Tests for JSON repair utility (port of BoletApp jsonRepair.ts)."""

import json

import pytest

from app.services.json_repair import (
    parse_json_with_repair,
    repair_json,
    strip_markdown_fences,
)


class TestStripMarkdownFences:
    def test_strips_json_fence(self):
        text = '```json\n{"key": "value"}\n```'
        assert strip_markdown_fences(text) == '{"key": "value"}'

    def test_strips_plain_fence(self):
        text = '```\n{"key": "value"}\n```'
        assert strip_markdown_fences(text) == '{"key": "value"}'

    def test_no_fence_passthrough(self):
        text = '{"key": "value"}'
        assert strip_markdown_fences(text) == '{"key": "value"}'

    def test_strips_surrounding_whitespace(self):
        text = '  ```json\n  {"a": 1}  \n```  '
        result = strip_markdown_fences(text)
        assert json.loads(result) == {"a": 1}


class TestRepairJson:
    def test_strips_line_comments(self):
        text = '{"key": "value" // comment\n}'
        result = repair_json(text)
        assert json.loads(result) == {"key": "value"}

    def test_preserves_urls(self):
        text = '{"url": "https://example.com"}'
        result = repair_json(text)
        assert json.loads(result) == {"url": "https://example.com"}

    def test_strips_block_comments(self):
        text = '{"key": /* block */ "value"}'
        result = repair_json(text)
        assert json.loads(result) == {"key": "value"}

    def test_quotes_unquoted_keys(self):
        text = '{key: "value", nested: {inner: 42}}'
        result = repair_json(text)
        parsed = json.loads(result)
        assert parsed == {"key": "value", "nested": {"inner": 42}}

    def test_converts_single_quotes(self):
        text = "{'key': 'value'}"
        result = repair_json(text)
        assert json.loads(result) == {"key": "value"}

    def test_removes_trailing_commas(self):
        text = '{"a": 1, "b": 2, }'
        result = repair_json(text)
        assert json.loads(result) == {"a": 1, "b": 2}

    def test_trailing_comma_in_array(self):
        text = '{"items": [1, 2, 3, ]}'
        result = repair_json(text)
        assert json.loads(result) == {"items": [1, 2, 3]}

    def test_rejects_oversized_input(self):
        with pytest.raises(ValueError, match="exceeds"):
            repair_json("x" * 600_000)


class TestParseJsonWithRepair:
    def test_valid_json_fast_path(self):
        result = parse_json_with_repair('{"key": "value"}')
        assert result == {"key": "value"}

    def test_markdown_fenced_json(self):
        text = '```json\n{"merchant": "Jumbo"}\n```'
        result = parse_json_with_repair(text)
        assert result == {"merchant": "Jumbo"}

    def test_malformed_json_repaired(self):
        text = "{merchant: 'Jumbo', total: 15990, }"
        result = parse_json_with_repair(text)
        assert result == {"merchant": "Jumbo", "total": 15990}

    def test_combined_fence_and_repair(self):
        text = "```json\n{merchant: 'Lider', items: [1, 2, 3,]}\n```"
        result = parse_json_with_repair(text)
        assert result == {"merchant": "Lider", "items": [1, 2, 3]}

    def test_unrepairable_raises(self):
        with pytest.raises(json.JSONDecodeError):
            parse_json_with_repair("this is not json at all {{{")
