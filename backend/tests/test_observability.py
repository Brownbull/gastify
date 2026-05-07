"""Tests for observability — structlog, request-id middleware, metrics endpoint, Prometheus."""

import uuid
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.observability import PROMETHEUS_CONTENT_TYPE, MetricsRegistry, metrics


class TestMetricsRegistry:
    def test_counter_increment(self):
        reg = MetricsRegistry()
        reg.inc("test_counter")
        reg.inc("test_counter")
        reg.inc("test_counter", 3)
        snap = reg.snapshot()
        assert snap["counters"]["test_counter"] == 5

    def test_histogram_observe(self):
        reg = MetricsRegistry()
        for v in [10.0, 20.0, 30.0]:
            reg.observe("test_hist", v)
        snap = reg.snapshot()
        h = snap["histograms"]["test_hist"]
        assert h["count"] == 3
        assert h["sum"] == 60.0
        assert h["min"] == 10.0
        assert h["max"] == 30.0
        assert h["p50"] == 20.0

    def test_snapshot_includes_uptime(self):
        reg = MetricsRegistry()
        snap = reg.snapshot()
        assert "uptime_seconds" in snap
        assert snap["uptime_seconds"] >= 0

    def test_empty_snapshot(self):
        reg = MetricsRegistry()
        snap = reg.snapshot()
        assert snap["counters"] == {}
        assert snap["histograms"] == {}

    def test_reservoir_overflow(self):
        reg = MetricsRegistry()
        for i in range(200):
            reg.observe("overflow_hist", float(i))
        snap = reg.snapshot()
        h = snap["histograms"]["overflow_hist"]
        assert h["count"] == 200


class TestHealthEndpoints:
    @pytest.fixture
    async def bare_client(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    async def test_liveness(self, bare_client):
        resp = await bare_client.get("/api/v1/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    async def test_readiness_no_db(self, bare_client):
        resp = await bare_client.get("/api/v1/health/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("ok", "unhealthy")


class TestMetricsEndpoint:
    @pytest.fixture
    async def bare_client(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    async def test_metrics_returns_snapshot(self, bare_client):
        resp = await bare_client.get("/api/v1/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert "uptime_seconds" in data
        assert "counters" in data
        assert "histograms" in data


class TestRequestIdMiddleware:
    @pytest.fixture
    async def bare_client(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    async def test_generates_request_id(self, bare_client):
        resp = await bare_client.get("/api/v1/health")
        assert "x-request-id" in resp.headers
        uuid.UUID(resp.headers["x-request-id"])

    async def test_propagates_provided_request_id(self, bare_client):
        custom_id = str(uuid.uuid4())
        resp = await bare_client.get(
            "/api/v1/health",
            headers={"x-request-id": custom_id},
        )
        assert resp.headers["x-request-id"] == custom_id


class TestAccessLogMiddleware:
    @pytest.fixture
    async def bare_client(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    async def test_request_increments_counters(self, bare_client):
        before = metrics.snapshot()
        before_total = before["counters"].get("http_requests_total", 0)
        before_2xx = before["counters"].get("http_requests_2xx", 0)

        await bare_client.get("/api/v1/health")

        after = metrics.snapshot()
        assert after["counters"]["http_requests_total"] > before_total
        assert after["counters"]["http_requests_2xx"] > before_2xx

    async def test_request_observes_duration(self, bare_client):
        before = metrics.snapshot()
        before_count = before["histograms"].get("http_request_duration_ms", {}).get("count", 0)

        await bare_client.get("/api/v1/health")

        after = metrics.snapshot()
        hist = after["histograms"]["http_request_duration_ms"]
        assert hist["count"] > before_count
        assert hist["min"] >= 0


class TestPrometheusFormat:
    def test_empty_registry_has_uptime(self):
        reg = MetricsRegistry()
        text = reg.prometheus_text()
        assert "# TYPE gastify_uptime_seconds gauge" in text
        assert "gastify_uptime_seconds " in text

    def test_counter_in_prometheus(self):
        reg = MetricsRegistry()
        reg.inc("http_requests_total", 42)
        text = reg.prometheus_text()
        assert "# TYPE gastify_http_requests_total counter" in text
        assert "gastify_http_requests_total 42" in text

    def test_counter_help_from_registry(self):
        reg = MetricsRegistry()
        reg.inc("http_requests_total")
        text = reg.prometheus_text()
        assert "# HELP gastify_http_requests_total Total HTTP requests processed." in text

    def test_histogram_as_summary(self):
        reg = MetricsRegistry()
        for v in [10.0, 20.0, 30.0]:
            reg.observe("scan_duration_ms", v)
        text = reg.prometheus_text()
        assert "# TYPE gastify_scan_duration_ms summary" in text
        assert 'gastify_scan_duration_ms{quantile="0.5"} 20.0' in text
        assert "gastify_scan_duration_ms_sum 60.0" in text
        assert "gastify_scan_duration_ms_count 3" in text

    def test_quantiles_require_sample_size(self):
        reg = MetricsRegistry()
        for v in [1.0, 2.0, 3.0]:
            reg.observe("small_hist", v)
        text = reg.prometheus_text()
        assert 'quantile="0.5"' in text
        assert 'quantile="0.95"' not in text
        assert 'quantile="0.99"' not in text

    def test_p95_at_20_samples(self):
        reg = MetricsRegistry()
        for i in range(20):
            reg.observe("medium_hist", float(i))
        text = reg.prometheus_text()
        assert 'quantile="0.95"' in text
        assert 'quantile="0.99"' not in text

    def test_scan_metric_help_strings(self):
        reg = MetricsRegistry()
        reg.observe("llm_latency_ms", 150.0)
        reg.observe("llm_tokens_in", 500.0)
        text = reg.prometheus_text()
        assert "# HELP gastify_llm_latency_ms LLM inference latency in milliseconds." in text
        assert "# HELP gastify_llm_tokens_in LLM input tokens per scan." in text


class TestMetricsContentNegotiation:
    @pytest.fixture
    async def bare_client(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

    async def test_default_returns_json(self, bare_client):
        resp = await bare_client.get("/api/v1/metrics")
        assert resp.status_code == 200
        assert "application/json" in resp.headers["content-type"]
        data = resp.json()
        assert "uptime_seconds" in data

    async def test_accept_text_plain_returns_prometheus(self, bare_client):
        resp = await bare_client.get(
            "/api/v1/metrics",
            headers={"accept": "text/plain"},
        )
        assert resp.status_code == 200
        assert PROMETHEUS_CONTENT_TYPE in resp.headers["content-type"]
        text = resp.text
        assert "gastify_uptime_seconds" in text
        assert "# TYPE" in text

    async def test_accept_json_returns_json(self, bare_client):
        resp = await bare_client.get(
            "/api/v1/metrics",
            headers={"accept": "application/json"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "counters" in data


class TestScanMetricColumns:
    async def test_transaction_with_scan_metrics(self, client):
        create_resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-01-15",
                "merchant": "Test Store",
                "total_minor": 5000,
                "currency": "CLP",
                "items": [{"name": "Item A", "total_price_minor": 5000}],
                "llm_tokens_in": 1200,
                "llm_tokens_out": 350,
                "llm_cost_usd": "0.004500",
                "scan_duration_ms": 2800,
                "llm_latency_ms": 1500,
                "queue_wait_ms": 200,
                "thumbnail_gen_ms": 300,
            },
        )
        assert create_resp.status_code == 201
        txn_id = create_resp.json()["id"]

        detail_resp = await client.get(f"/api/v1/transactions/{txn_id}")
        assert detail_resp.status_code == 200
        data = detail_resp.json()
        assert data["llm_tokens_in"] == 1200
        assert data["llm_tokens_out"] == 350
        assert Decimal(data["llm_cost_usd"]) == Decimal("0.004500")
        assert data["scan_duration_ms"] == 2800
        assert data["llm_latency_ms"] == 1500
        assert data["queue_wait_ms"] == 200
        assert data["thumbnail_gen_ms"] == 300

    async def test_transaction_without_scan_metrics(self, client):
        create_resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-01-15",
                "merchant": "Manual Entry",
                "total_minor": 3000,
                "currency": "CLP",
                "items": [{"name": "Item B", "total_price_minor": 3000}],
            },
        )
        assert create_resp.status_code == 201
        txn_id = create_resp.json()["id"]

        detail_resp = await client.get(f"/api/v1/transactions/{txn_id}")
        assert detail_resp.status_code == 200
        data = detail_resp.json()
        assert data["llm_tokens_in"] is None
        assert data["scan_duration_ms"] is None
