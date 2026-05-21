"""Curated non-production scan test-case catalog."""

from __future__ import annotations

import io
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

from PIL import Image

from app.prompt_lab.adapter import ZERO_EXP_CURRENCIES, load_expected_receipt
from app.schemas.scan import GeminiExtractionResult, LineItemExtraction
from app.schemas.scan_test_cases import ScanTestCaseSummary, ScanTestProviderMode

FIXTURE_ROOT = Path(__file__).resolve().parents[1] / "fixtures" / "scan-test-cases"


@dataclass(frozen=True)
class ScanTestCase:
    id: str
    label: str
    description: str
    source: str
    provider_modes: tuple[ScanTestProviderMode, ...]
    convenience_only: bool
    image_path: Path | None = None
    expected_path: Path | None = None

    @property
    def has_image(self) -> bool:
        return self.image_path is not None

    def summary(self) -> ScanTestCaseSummary:
        return ScanTestCaseSummary(
            id=self.id,
            label=self.label,
            description=self.description,
            source=self.source,
            provider_modes=list(self.provider_modes),
            convenience_only=self.convenience_only,
            has_image=self.has_image,
        )


CATALOG: tuple[ScanTestCase, ...] = (
    ScanTestCase(
        id="happy",
        label="Happy path",
        description="Schema-backed deterministic completed receipt.",
        source="gastify-fixture",
        provider_modes=("mock", "fixture"),
        convenience_only=True,
    ),
    ScanTestCase(
        id="review",
        label="Review path",
        description="Low-confidence unknown merchant requiring review.",
        source="gastify-fixture",
        provider_modes=("mock", "fixture"),
        convenience_only=True,
    ),
    ScanTestCase(
        id="failure",
        label="Failure path",
        description="Deterministic scan failure and retry affordance.",
        source="gastify-fixture",
        provider_modes=("mock", "fixture"),
        convenience_only=True,
    ),
    ScanTestCase(
        id="supermarket-super-lider",
        label="Supermarket Lider",
        description="Long Chilean supermarket receipt.",
        source="boletapp-prompt-testing",
        provider_modes=("gemini",),
        convenience_only=True,
        image_path=FIXTURE_ROOT / "supermarket" / "super_lider.jpg",
        expected_path=FIXTURE_ROOT / "supermarket" / "super_lider.expected.json",
    ),
    ScanTestCase(
        id="restaurant-2001",
        label="Restaurant 2001",
        description="Restaurant receipt with itemized detail.",
        source="boletapp-prompt-testing",
        provider_modes=("gemini",),
        convenience_only=True,
        image_path=FIXTURE_ROOT / "restaurant" / "restaurant_2001_recibo.jpg",
        expected_path=FIXTURE_ROOT / "restaurant" / "restaurant_2001_recibo.expected.json",
    ),
    ScanTestCase(
        id="gas-copec",
        label="Gas station Copec",
        description="Fuel station receipt.",
        source="boletapp-prompt-testing",
        provider_modes=("gemini",),
        convenience_only=True,
        image_path=FIXTURE_ROOT / "gas-station" / "copec.jpg",
        expected_path=FIXTURE_ROOT / "gas-station" / "copec.expected.json",
    ),
    ScanTestCase(
        id="convenience-dobler",
        label="Convenience Dobler",
        description="Convenience receipt with compact layout.",
        source="boletapp-prompt-testing",
        provider_modes=("gemini",),
        convenience_only=True,
        image_path=FIXTURE_ROOT / "convenience" / "dobler.jpg",
        expected_path=FIXTURE_ROOT / "convenience" / "dobler.expected.json",
    ),
    ScanTestCase(
        id="edge-quantity-total",
        label="Quantity total edge",
        description="Receipt with quantity/total edge cases.",
        source="boletapp-prompt-testing",
        provider_modes=("gemini",),
        convenience_only=True,
        image_path=FIXTURE_ROOT / "edge-cases" / "edgeqtytotal.jpeg",
        expected_path=FIXTURE_ROOT / "edge-cases" / "edgeqtytotal.expected.json",
    ),
    ScanTestCase(
        id="adversarial-chilean-thousands",
        label="Chilean thousands",
        description="Adversarial Chilean thousands separator case.",
        source="boletapp-prompt-testing",
        provider_modes=("gemini",),
        convenience_only=True,
        image_path=FIXTURE_ROOT / "adversarial" / "chilean-thousands.jpg",
        expected_path=FIXTURE_ROOT / "adversarial" / "chilean-thousands.fixture.json",
    ),
)

_CASES_BY_ID = {case.id: case for case in CATALOG}


def list_scan_test_cases(provider: str | None = None) -> list[ScanTestCase]:
    if provider is None:
        return list(CATALOG)
    return [case for case in CATALOG if provider in case.provider_modes]


def get_scan_test_case(case_id: str) -> ScanTestCase | None:
    return _CASES_BY_ID.get(case_id.strip().lower())


def read_scan_test_case_image(case: ScanTestCase) -> tuple[bytes, str, str]:
    """Return raw image bytes, filename, and content type for a test case."""
    if case.image_path is not None:
        raw = case.image_path.read_bytes()
        content_type = "image/jpeg"
        filename = case.image_path.name
        return raw, filename, content_type

    return _generated_receipt_image(case.id), f"gastify-test-case-{case.id}.jpg", "image/jpeg"


def load_expected_extraction(case: ScanTestCase) -> GeminiExtractionResult | None:
    if case.expected_path is None:
        return None
    expected = load_expected_receipt(case.expected_path, case_id=case.id)
    items = expected.items or []
    if not items:
        items = []
    return GeminiExtractionResult(
        merchant_name=expected.merchant,
        transaction_date=expected.transaction_date or "2026-05-18",
        currency_code=expected.currency,
        total_amount=_minor_to_decimal(expected.total_minor, expected.currency),
        line_items=[
            LineItemExtraction(
                name=item.name,
                qty=item.quantity,
                total_price=_minor_to_decimal(item.total_minor, expected.currency),
            )
            for item in items
        ]
        or [
            LineItemExtraction(
                name="Receipt total",
                total_price=_minor_to_decimal(expected.total_minor, expected.currency),
            )
        ],
        confidence_score=expected.confidence or 0.9,
    )


def _generated_receipt_image(case_id: str) -> bytes:
    image = Image.new("RGB", (900, 600), color=(248, 250, 252))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


def _minor_to_decimal(amount_minor: int, currency: str) -> Decimal:
    if currency in ZERO_EXP_CURRENCIES:
        return Decimal(amount_minor)
    return Decimal(amount_minor) / Decimal("100")
