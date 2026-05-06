"""Tests for observability — structlog, request-id middleware, metrics endpoint."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.observability import MetricsRegistry, metrics


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
