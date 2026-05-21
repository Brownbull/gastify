#!/usr/bin/env python3
"""Exercise local scan upload paths through the FastAPI app.

This smoke uses the same dependency override style as the backend tests. It is
not a production auth bypass and should only run with local + mock provider.
"""

from __future__ import annotations

import asyncio
import io
import json
import os
import sys
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
ARTIFACT_DIR = ROOT_DIR / ".tmp" / "local" / "smoke"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

os.environ.setdefault("GASTIFY_ENVIRONMENT", "local")
os.environ.setdefault("GASTIFY_SCAN_PROVIDER", "mock")
os.environ.setdefault(
    "GASTIFY_DATABASE_URL",
    f"sqlite+aiosqlite:///{ROOT_DIR / '.tmp' / 'local' / 'gastify.db'}",
)
os.environ.setdefault("GASTIFY_SCAN_STORAGE_DIR", str(ROOT_DIR / ".tmp" / "local" / "scans"))

sys.path.insert(0, str(BACKEND_DIR))

from httpx import ASGITransport, AsyncClient  # noqa: E402
from PIL import Image  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.auth.firebase import FirebaseUser, get_current_user  # noqa: E402
from app.config import settings  # noqa: E402
from app.db import async_session  # noqa: E402
from app.main import app  # noqa: E402
from app.models.fx import FxRate  # noqa: E402
from app.models.scan import Scan, ScanStatus  # noqa: E402
from app.models.transaction import Transaction  # noqa: E402

CASES = [
    {"key": "happy", "filename": "local-happy.jpg", "expected_status": ScanStatus.COMPLETED},
    {"key": "review", "filename": "local-review.jpg", "expected_status": ScanStatus.COMPLETED},
    {"key": "failure", "filename": "local-failure.jpg", "expected_status": ScanStatus.FAILED},
]


def _assert_local() -> None:
    if settings.environment != "local":
        raise SystemExit(f"Refusing smoke outside local: {settings.environment}")
    if settings.scan_provider != "mock":
        raise SystemExit(f"Refusing smoke without mock scan provider: {settings.scan_provider}")
    if not settings.database_url.startswith("sqlite"):
        raise SystemExit("Refusing smoke without SQLite database URL")


def _jpeg_bytes(color: str) -> bytes:
    image = Image.new("RGB", (800, 600), color=color)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


async def _mock_user() -> FirebaseUser:
    return FirebaseUser(
        uid="local-smoke-user",
        email="local-smoke@gastify.test",
        name="Local Smoke",
    )


async def _seed_fx_rate() -> None:
    async with async_session() as db:
        await db.merge(
            FxRate(
                rate_date=date(2026, 5, 18),
                from_currency="CLP",
                to_currency="USD",
                rate=Decimal("0.00105000"),
                source="local-smoke",
            )
        )
        await db.commit()


async def _scan_status(scan_id: uuid.UUID) -> ScanStatus:
    async with async_session() as db:
        result = await db.execute(select(Scan.status).where(Scan.id == scan_id))
        status = result.scalar_one()
        return ScanStatus(status)


async def _transaction_for_scan(scan_id: uuid.UUID) -> dict[str, object] | None:
    async with async_session() as db:
        result = await db.execute(
            select(
                Transaction.id, Transaction.merchant, Transaction.total_minor, Transaction.currency
            )
            .where(Transaction.thumbnail_url.like(f"%{scan_id}%"))
            .order_by(Transaction.created_at.desc())
            .limit(1)
        )
        row = result.one_or_none()
        if row is None:
            return None
        transaction_id, merchant, total_minor, currency = row
        return {
            "transaction_id": str(transaction_id),
            "merchant": merchant,
            "total_minor": total_minor,
            "currency": currency,
        }


async def _run_case(client: AsyncClient, case: dict[str, object], color: str) -> dict[str, object]:
    raw = _jpeg_bytes(color)
    response = await client.post(
        "/api/v1/scans",
        files={"file": (str(case["filename"]), raw, "image/jpeg")},
    )
    if response.status_code != 201:
        raise RuntimeError(f"{case['key']} upload failed: {response.status_code} {response.text}")

    data = response.json()
    scan_id = uuid.UUID(data["id"])

    final_status: ScanStatus | None = None
    for _ in range(40):
        final_status = await _scan_status(scan_id)
        if final_status in (ScanStatus.COMPLETED, ScanStatus.NEEDS_REVIEW, ScanStatus.FAILED):
            break
        await asyncio.sleep(0.1)

    expected = case["expected_status"]
    if final_status != expected:
        raise RuntimeError(f"{case['key']} expected {expected}, got {final_status}")

    transaction = await _transaction_for_scan(scan_id)

    return {
        "case": case["key"],
        "filename": case["filename"],
        "scan_id": str(scan_id),
        "upload_status": response.status_code,
        "final_status": final_status.value,
        "file_size_bytes": data["file_size_bytes"],
        "transaction": transaction,
    }


async def main() -> None:
    _assert_local()
    await _seed_fx_rate()

    app.dependency_overrides[get_current_user] = _mock_user
    colors = ["red", "blue", "green"]
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://local-smoke") as client:
            results = [
                await _run_case(client, case, color)
                for case, color in zip(CASES, colors, strict=True)
            ]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    artifact = {
        "ran_at": datetime.now(UTC).isoformat(),
        "environment": settings.environment,
        "scan_provider": settings.scan_provider,
        "database_url": settings.database_url,
        "scan_storage_dir": settings.scan_storage_dir,
        "results": results,
        "current_run_transaction_count": sum(1 for result in results if result["transaction"]),
    }
    artifact_path = ARTIFACT_DIR / "latest.json"
    artifact_path.write_text(json.dumps(artifact, indent=2, sort_keys=True), encoding="utf-8")

    print(json.dumps(artifact, indent=2, sort_keys=True))
    print(f"Local smoke artifact: {artifact_path}")


if __name__ == "__main__":
    asyncio.run(main())
