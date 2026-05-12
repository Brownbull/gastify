"""Tests for the PydanticAI vision extraction agent."""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agents.extraction import (
    ExtractionResult,
    ExtractionUsage,
    _build_agent,
    extract_receipt,
)
from app.schemas.scan import GeminiExtractionResult, LineItemExtraction


def _mock_extraction(**overrides) -> GeminiExtractionResult:
    defaults = {
        "merchant_name": "Supermercado Jumbo",
        "transaction_date": "2026-05-10",
        "currency_code": "CLP",
        "total_amount": Decimal("15990"),
        "tax_amount": Decimal("2542"),
        "discount_amount": None,
        "line_items": [
            LineItemExtraction(name="Leche Colun 1L", total_price=Decimal("1290")),
            LineItemExtraction(name="Pan Hallulla x6", total_price=Decimal("1990")),
        ],
        "confidence_score": 0.92,
    }
    defaults.update(overrides)
    return GeminiExtractionResult(**defaults)


def _mock_usage() -> MagicMock:
    usage = MagicMock()
    usage.input_tokens = 1500
    usage.output_tokens = 250
    return usage


class TestBuildAgent:
    def test_uses_default_model(self):
        with patch("app.agents.extraction.settings") as mock_settings:
            mock_settings.gemini_model = "gemini-2.5-flash"
            with patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"}):
                agent = _build_agent()
                assert agent is not None

    def test_uses_test_model(self):
        agent = _build_agent("test")
        assert agent is not None


class TestExtractReceipt:
    @pytest.fixture
    def mock_agent_run(self):
        mock_result = MagicMock()
        mock_result.output = _mock_extraction()
        mock_result.usage = _mock_usage()
        return mock_result

    @pytest.mark.asyncio
    async def test_returns_extraction_result(self, mock_agent_run):
        with patch("app.agents.extraction._build_agent") as mock_build:
            mock_agent = AsyncMock()
            mock_agent.run = AsyncMock(return_value=mock_agent_run)
            mock_build.return_value = mock_agent

            result = await extract_receipt(
                image_bytes=b"fake-jpeg-data",
                content_type="image/jpeg",
            )

            assert isinstance(result, ExtractionResult)
            assert result.extraction.merchant_name == "Supermercado Jumbo"
            assert result.extraction.currency_code == "CLP"
            assert result.extraction.total_amount == Decimal("15990")
            assert len(result.extraction.line_items) == 2

    @pytest.mark.asyncio
    async def test_usage_metrics_populated(self, mock_agent_run):
        with patch("app.agents.extraction._build_agent") as mock_build:
            mock_agent = AsyncMock()
            mock_agent.run = AsyncMock(return_value=mock_agent_run)
            mock_build.return_value = mock_agent

            result = await extract_receipt(
                image_bytes=b"fake-jpeg-data",
                content_type="image/jpeg",
            )

            assert isinstance(result.usage, ExtractionUsage)
            assert result.usage.input_tokens == 1500
            assert result.usage.output_tokens == 250
            assert result.usage.latency_ms >= 0

    @pytest.mark.asyncio
    async def test_coalescing_applied(self, mock_agent_run):
        mock_agent_run.output = _mock_extraction(
            merchant_name="null",
            currency_code="clp",
        )

        with patch("app.agents.extraction._build_agent") as mock_build:
            mock_agent = AsyncMock()
            mock_agent.run = AsyncMock(return_value=mock_agent_run)
            mock_build.return_value = mock_agent

            result = await extract_receipt(
                image_bytes=b"fake-jpeg-data",
                content_type="image/jpeg",
            )

            assert result.extraction.merchant_name == "Unknown"
            assert result.extraction.currency_code == "CLP"

    @pytest.mark.asyncio
    async def test_passes_image_as_binary_content(self, mock_agent_run):
        with patch("app.agents.extraction._build_agent") as mock_build:
            mock_agent = AsyncMock()
            mock_agent.run = AsyncMock(return_value=mock_agent_run)
            mock_build.return_value = mock_agent

            await extract_receipt(
                image_bytes=b"jpeg-data-here",
                content_type="image/jpeg",
            )

            call_args = mock_agent.run.call_args
            user_prompt = call_args[0][0]
            assert len(user_prompt) == 2
            assert user_prompt[0].data == b"jpeg-data-here"
            assert user_prompt[0].media_type == "image/jpeg"

    @pytest.mark.asyncio
    async def test_zero_price_items_dropped(self, mock_agent_run):
        mock_agent_run.output = _mock_extraction(
            line_items=[
                LineItemExtraction(name="Item A", total_price=Decimal("1000")),
                LineItemExtraction(name="Free Gift", total_price=Decimal("0")),
            ],
        )

        with patch("app.agents.extraction._build_agent") as mock_build:
            mock_agent = AsyncMock()
            mock_agent.run = AsyncMock(return_value=mock_agent_run)
            mock_build.return_value = mock_agent

            result = await extract_receipt(
                image_bytes=b"data",
                content_type="image/jpeg",
            )

            assert len(result.extraction.line_items) == 1
            assert result.extraction.line_items[0].name == "Item A"

    @pytest.mark.asyncio
    async def test_scan_date_passed_to_coalesce(self, mock_agent_run):
        from datetime import date

        mock_agent_run.output = _mock_extraction(transaction_date="null")

        with patch("app.agents.extraction._build_agent") as mock_build:
            mock_agent = AsyncMock()
            mock_agent.run = AsyncMock(return_value=mock_agent_run)
            mock_build.return_value = mock_agent

            result = await extract_receipt(
                image_bytes=b"data",
                content_type="image/jpeg",
                scan_date=date(2026, 5, 12),
            )

            assert result.extraction.transaction_date == "2026-05-12"
