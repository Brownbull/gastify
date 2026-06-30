"""Versioned receipt validation thresholds shared by runtime and prompt-lab code."""

from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class ReceiptValidationPolicy:
    policy_id: str = "receipt-validation-policy"
    policy_version: str = "2026-06-30.v2"
    math_exact_tolerance_minor_units: int = 1
    major_reconstruction_discrepancy_ratio: float = 0.25
    significant_item_count_delta_ratio: float = 0.25
    significant_item_total_mismatch_ratio: float = 0.25
    significant_quantity_mismatch_ratio: float = 0.25
    significant_unit_price_mismatch_ratio: float = 0.25
    significant_discount_delta_ratio: float = 0.25
    # Severity-only carve-out: a by-name item total / unit price that is off by no more than
    # max(near_miss_item_delta_minor_units, near_miss_item_delta_ratio * expected) is treated as
    # a match WHEN the whole receipt math reconciles — so a tiny OCR slip on one item of an
    # otherwise-balanced receipt no longer flips minor -> significant. The strict gate is unchanged.
    near_miss_item_delta_minor_units: int = 5
    near_miss_item_delta_ratio: float = 0.005
    discount_delta_denominator: str = "expected_final_total_minor"

    def to_dict(self) -> dict[str, str | int | float]:
        return asdict(self)


DEFAULT_RECEIPT_VALIDATION_POLICY = ReceiptValidationPolicy()


def get_receipt_validation_policy(path: str | Path | None = None) -> ReceiptValidationPolicy:
    """Return the configured policy, defaulting to the checked-in V1 thresholds."""
    policy_path = path or os.environ.get("GASTIFY_RECEIPT_VALIDATION_POLICY_PATH")
    if not policy_path:
        return DEFAULT_RECEIPT_VALIDATION_POLICY
    payload = json.loads(Path(policy_path).read_text(encoding="utf-8"))
    return _policy_from_payload(payload)


def _policy_from_payload(payload: dict[str, Any]) -> ReceiptValidationPolicy:
    policy_values = dict(payload.get("policy") or payload)
    return ReceiptValidationPolicy(**policy_values)
