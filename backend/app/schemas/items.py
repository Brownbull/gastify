"""Items (cross-transaction line-item list) schemas — Phase 6.

The Items screen browses individual line items ACROSS transactions (a flat list,
one row per `transaction_items` row), with category keys denormalized so clients
need no taxonomy fetch. Aggregation/dedup by item name is intentionally deferred
(mvp = browse + filter, not roll-up).
"""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel


class ItemListRow(BaseModel):
    """One line item with its parent transaction's context (GET /api/v1/items)."""

    model_config = {"from_attributes": True}

    id: UUID
    name: str
    qty: float | None = None
    # Aliased from transaction_items.total_price_minor — the line total in minor units.
    total_minor: int
    currency: str
    item_category_id: UUID | None = None
    item_category_key: str | None = None
    store_category_id: UUID | None = None
    store_category_key: str | None = None
    # Parent transaction context (rows deep-link to the transaction detail).
    transaction_id: UUID
    transaction_date: date
    transaction_time: time | None = None
    merchant: str
    created_at: datetime
