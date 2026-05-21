from __future__ import annotations

import importlib.util
import json
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

SCRIPT_PATH = Path(__file__).resolve().parents[2] / "scripts" / "ops" / "cost_snapshot.py"
SPEC = importlib.util.spec_from_file_location("cost_snapshot", SCRIPT_PATH)
assert SPEC is not None
cost_snapshot = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(cost_snapshot)


def test_prompt_lab_cost_aggregation_filters_by_manifest_window(tmp_path: Path) -> None:
    root = tmp_path
    included = (
        root
        / "prompt-testing"
        / "results"
        / "latest"
        / "local"
        / "receipt-extraction-v2-evidence"
        / "run-a"
        / "case-a"
    )
    excluded = included.parent / "case-old"
    included.mkdir(parents=True)
    excluded.mkdir(parents=True)

    _write_cost_summary(included, input_tokens=100, output_tokens=20, cost_usd="0.000018")
    _write_manifest(included, generated_at="2026-05-21T12:00:00+00:00")
    _write_cost_summary(excluded, input_tokens=999, output_tokens=999, cost_usd="9")
    _write_manifest(excluded, generated_at="2026-05-19T12:00:00+00:00")

    warnings: list[str] = []
    summary = cost_snapshot.aggregate_prompt_lab_costs(
        root,
        since_at=datetime(2026, 5, 21, 0, 0, tzinfo=UTC),
        until_at=datetime(2026, 5, 22, 0, 0, tzinfo=UTC),
        warnings=warnings,
    )

    assert warnings == []
    assert summary["files"] == 1
    assert summary["skipped_before_window"] == 1
    assert summary["totals"] == {
        "input_tokens": 100,
        "output_tokens": 20,
        "total_tokens": 120,
        "cost_usd": "0.000018",
    }
    assert summary["by_model"]["gemini-2.5-flash-lite"]["files"] == 1


def test_railway_metrics_parser_summarizes_services_and_volumes() -> None:
    payload = {
        "project": "Gastify",
        "environment": "staging",
        "window": {"since": "2026-05-20T00:00:00Z"},
        "services": [
            {
                "id": "svc-api",
                "name": "gastify-api-staging",
                "cpu": {"current": 0.001, "limit": 8.0, "unit": "vCPU"},
                "memory": {"current_mb": 256.0, "limit_mb": 8192.0, "utilization_pct": 3.125},
                "network": {"egress_mb": 1.5, "ingress_mb": 2.5},
                "volumes": [
                    {
                        "name": "api-volume",
                        "mount_path": "/data",
                        "current_mb": 10.0,
                        "limit_mb": 5000.0,
                    }
                ],
            },
            {"id": "svc-web", "name": "gastify-web-staging"},
        ],
    }

    summary = cost_snapshot.summarize_railway_metrics(payload)

    assert summary["status"] == "ok"
    assert summary["services"][0]["name"] == "gastify-api-staging"
    assert summary["services"][0]["volumes"][0]["utilization_pct"] == 0.2
    assert summary["totals"]["memory_current_mb"] == 256.0
    assert summary["totals"]["volume_current_mb"] == 10.0
    assert summary["totals"]["network_ingress_mb"] == 2.5


def test_railway_db_sql_uses_zero_safe_aggregates() -> None:
    script = cost_snapshot.railway_db_inline_script()

    assert "COALESCE(SUM(llm_tokens_in), 0)" in script
    assert "COALESCE(SUM(llm_tokens_out), 0)" in script
    assert "COALESCE(SUM(llm_cost_usd), 0)" in script
    assert "COUNT(*)::int AS transactions" in script


def test_combined_app_estimate_zero_row_behavior() -> None:
    prompt = cost_snapshot.empty_prompt_lab_summary("ok")
    db = cost_snapshot.empty_railway_db_summary("ok")

    totals = cost_snapshot.combine_app_estimate_totals(prompt, db)

    assert totals == {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "cost_usd": "0",
    }


def test_bigquery_query_builder_and_import_guard(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    query = cost_snapshot.build_google_billing_query("billing_project.dataset.gcp_billing_export")

    assert "FROM `billing_project.dataset.gcp_billing_export`" in query
    assert "REGEXP_CONTAINS" in query
    assert "@since_at" in query
    assert "@until_at" in query

    def missing_bigquery():
        raise ImportError("missing")

    monkeypatch.setattr(cost_snapshot, "import_bigquery", missing_bigquery)
    warnings: list[str] = []
    result = cost_snapshot.query_google_billing(
        table="billing_project.dataset.gcp_billing_export",
        project=None,
        filter_regex="gemini",
        since_at=datetime(2026, 5, 21, tzinfo=UTC),
        until_at=datetime(2026, 5, 22, tzinfo=UTC),
        warnings=warnings,
    )

    assert result == {"status": "unavailable", "reason": "missing google-cloud-bigquery"}
    assert warnings == [
        "google-cloud-bigquery is not installed in this environment; "
        "exact Google billing was skipped."
    ]


def test_google_billing_rows_are_stringified(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    class FakeBigQuery:
        class ScalarQueryParameter:
            def __init__(self, name: str, type_: str, value: object) -> None:
                self.name = name
                self.type_ = type_
                self.value = value

        class QueryJobConfig:
            def __init__(self, query_parameters: list[object]) -> None:
                self.query_parameters = query_parameters

        class Client:
            def __init__(self, project: str | None = None) -> None:
                self.project = project

            def query(self, query: str, job_config: object) -> object:
                assert "billing_project.dataset.export" in query
                assert job_config is not None
                return SimpleNamespace(
                    result=lambda: [
                        SimpleNamespace(
                            project_id="gastify-staging",
                            service="Generative AI",
                            sku="Gemini 2.5 Flash-Lite",
                            currency="USD",
                            gross_cost="1.25",
                            credits="-0.25",
                            net_cost="1.00",
                        )
                    ]
                )

    monkeypatch.setattr(cost_snapshot, "import_bigquery", lambda: FakeBigQuery)
    result = cost_snapshot.query_google_billing(
        table="billing_project.dataset.export",
        project="billing-project",
        filter_regex="gemini",
        since_at=datetime(2026, 5, 21, tzinfo=UTC),
        until_at=datetime(2026, 5, 22, tzinfo=UTC),
        warnings=[],
    )

    assert result["status"] == "ok"
    assert result["totals"] == {"gross_cost": "1.25", "credits": "-0.25", "net_cost": "1"}
    assert result["rows"][0]["net_cost"] == "1"


def _write_cost_summary(
    directory: Path,
    *,
    input_tokens: int,
    output_tokens: int,
    cost_usd: str,
) -> None:
    payload = {
        "normalized_model_name": "gemini-2.5-flash-lite",
        "totals": {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "cost_usd": cost_usd,
        },
    }
    (directory / "cost_summary.json").write_text(json.dumps(payload), encoding="utf-8")


def _write_manifest(directory: Path, *, generated_at: str) -> None:
    (directory / "manifest.json").write_text(
        json.dumps({"generated_at": generated_at}),
        encoding="utf-8",
    )
