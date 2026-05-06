"""Tests for FX rate service, USD-shadow compute, and i18n."""

from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.services.fx import FxServiceError, compute_usd_shadow


class TestComputeUsdShadow:
    def test_clp_to_usd(self) -> None:
        # 15990 CLP (exp=0) at rate 0.00105 → ~16.79 USD → 1679 cents
        result = compute_usd_shadow(15990, from_exponent=0, fx_rate=Decimal("0.00105"))
        assert result == 1679

    def test_eur_to_usd(self) -> None:
        # 1050 EUR cents (exp=2) at rate 1.08 → 1134 USD cents
        result = compute_usd_shadow(1050, from_exponent=2, fx_rate=Decimal("1.08"))
        assert result == 1134

    def test_same_currency(self) -> None:
        result = compute_usd_shadow(500, from_exponent=2, fx_rate=Decimal("1"))
        assert result == 500

    def test_large_amount(self) -> None:
        # 1,000,000 CLP at 0.001 → 100,000 cents = $1000
        result = compute_usd_shadow(1_000_000, from_exponent=0, fx_rate=Decimal("0.001"))
        assert result == 100_000


class TestFxServiceIntegration:
    """Tests that exercise FX rate lookup with mocked external API."""

    @pytest.fixture
    def mock_fx_response(self):
        """Patch the external FX fetch to return a known rate."""
        with patch("app.services.fx._fetch_external_rate", new_callable=AsyncMock) as mock:
            mock.return_value = Decimal("0.00105")
            yield mock

    async def test_create_transaction_computes_usd_shadow(
        self, client: AsyncClient, mock_fx_response: AsyncMock
    ) -> None:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Supermercado Jumbo",
                "total_minor": 15990,
                "currency": "CLP",
                "receipt_type": "manual",
            },
        )
        assert resp.status_code == 201
        txn_id = resp.json()["id"]

        get_resp = await client.get(f"/api/v1/transactions/{txn_id}")
        data = get_resp.json()
        assert data["amount_usd_minor"] == 1679
        assert data["fx_rate_to_usd"] is not None

    async def test_usd_transaction_no_fx_lookup(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Amazon",
                "total_minor": 2999,
                "currency": "USD",
            },
        )
        assert resp.status_code == 201
        txn_id = resp.json()["id"]

        get_resp = await client.get(f"/api/v1/transactions/{txn_id}")
        data = get_resp.json()
        assert data["amount_usd_minor"] == 2999
        assert data["fx_rate_to_usd"] is None

    async def test_fx_failure_rejects_transaction(
        self, client: AsyncClient
    ) -> None:
        """Per D2 ent tier: FX failure = reject with retry hint."""
        with patch(
            "app.services.fx._fetch_external_rate",
            new_callable=AsyncMock,
            side_effect=FxServiceError("FX unavailable"),
        ):
            resp = await client.post(
                "/api/v1/transactions",
                json={
                    "transaction_date": "2026-05-04",
                    "merchant": "Mercado",
                    "total_minor": 5000,
                    "currency": "CLP",
                },
            )
            assert resp.status_code == 503
            assert "retry" in resp.json()["detail"].lower()

    async def test_cached_rate_reused(
        self, client: AsyncClient, mock_fx_response: AsyncMock
    ) -> None:
        """Second transaction on the same day/currency should hit the cache."""
        await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Store A",
                "total_minor": 1000,
                "currency": "CLP",
            },
        )
        await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Store B",
                "total_minor": 2000,
                "currency": "CLP",
            },
        )
        # External fetch should only be called once — second hit uses cached row
        assert mock_fx_response.call_count == 1


class TestI18n:
    def test_lookup_es(self) -> None:
        from app.i18n import t

        assert t("auth.unauthorized", "es") == "No autorizado"

    def test_lookup_en(self) -> None:
        from app.i18n import t

        assert t("auth.unauthorized", "en") == "Unauthorized"

    def test_lookup_pt(self) -> None:
        from app.i18n import t

        assert t("auth.unauthorized", "pt") == "Não autorizado"

    def test_fallback_to_default(self) -> None:
        from app.i18n import t

        assert t("auth.unauthorized") == "No autorizado"

    def test_unknown_key_returns_key(self) -> None:
        from app.i18n import t

        assert t("nonexistent.key") == "nonexistent.key"

    def test_available_keys(self) -> None:
        from app.i18n import available_keys

        keys = available_keys()
        assert "auth.unauthorized" in keys
        assert "transaction.not_found" in keys
        assert len(keys) >= 8
