"""Tests for PydanticAI categorization agent."""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.categorization import (
    _format_items_for_prompt,
    categorize_items,
)
from app.schemas.scan import (
    CategorizationResult,
    CategoryAssignment,
    LineItemExtraction,
)


def _items() -> list[LineItemExtraction]:
    return [
        LineItemExtraction(name="Leche Entera 1L", total_price=Decimal("2990")),
        LineItemExtraction(name="Pan Integral", qty=Decimal("2"), total_price=Decimal("3980")),
        LineItemExtraction(name="Café Nescafé", total_price=Decimal("4490")),
    ]


class TestFormatItems:
    def test_basic_formatting(self):
        items = _items()
        text = _format_items_for_prompt(items)
        assert "[0] Leche Entera 1L" in text
        assert "[1] Pan Integral x2" in text
        assert "[2] Café Nescafé" in text

    def test_empty_items(self):
        assert _format_items_for_prompt([]) == ""

    def test_no_qty_no_suffix(self):
        items = [LineItemExtraction(name="Item", total_price=Decimal("100"))]
        assert "x" not in _format_items_for_prompt(items)

    def test_qty_one_no_suffix(self):
        items = [LineItemExtraction(name="Item", qty=Decimal("1"), total_price=Decimal("100"))]
        assert "x" not in _format_items_for_prompt(items)


def _mock_agent_result(assignments):
    result = CategorizationResult(assignments=assignments)
    mock = MagicMock()
    mock.output = result
    mock.usage = MagicMock(input_tokens=800, output_tokens=120)
    return mock


class TestCategorizeItems:
    @pytest.mark.asyncio
    async def test_returns_assignments(self):
        agent_result = _mock_agent_result(
            [
                CategoryAssignment(
                    line_item_index=0,
                    category_key="Supermercado",
                    confidence=0.95,
                ),
                CategoryAssignment(
                    line_item_index=1,
                    category_key="Panaderia",
                    confidence=0.88,
                ),
                CategoryAssignment(
                    line_item_index=2,
                    category_key="CafeteriaSnack",
                    confidence=0.82,
                ),
            ]
        )

        with patch("app.agents.categorization._build_agent") as mock_build:
            mock_agent = MagicMock()
            mock_agent.run = AsyncMock(return_value=agent_result)
            mock_build.return_value = mock_agent

            output = await categorize_items(
                items=_items(),
                merchant_name="Jumbo",
                currency_code="CLP",
            )

        assert len(output.result.assignments) == 3
        assert output.result.assignments[0].category_key == "Supermercado"
        assert output.usage.input_tokens == 800

    @pytest.mark.asyncio
    async def test_prompt_includes_merchant_and_currency(self):
        agent_result = _mock_agent_result([])

        with patch("app.agents.categorization._build_agent") as mock_build:
            mock_agent = MagicMock()
            mock_agent.run = AsyncMock(return_value=agent_result)
            mock_build.return_value = mock_agent

            await categorize_items(
                items=_items(),
                merchant_name="Walmart",
                currency_code="USD",
            )

            prompt = mock_agent.run.call_args[0][0]
            assert "Walmart" in prompt
            assert "USD" in prompt
