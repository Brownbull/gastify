"""Seed demo analytics data on staging-e2e so the bars/screenshots show real content.

Spreads deterministic, item-rich transactions for the shared e2e user across EVERY ISO
week from 2025-11 through today: weekly navigation always has data, and the year/
quarter boundary periods (2025-12, 2025-Q4, 2025-W52) render populated screens.
L1/L2 come from each transaction's store category; L3/L4 from item categories — so
every cut of the L1-L4 bar is non-empty.

Idempotent: all demo merchants carry the "Demo " prefix; re-runs delete + reseed.

Usage:
  GASTIFY_SEED_DSN=postgresql://... uv run python scripts/staging/seed-analytics-demo.py
NEVER run against production.
"""

import asyncio
import os
import uuid
from datetime import date, timedelta

import asyncpg

E2E_EMAIL = "gastify-mobile-e2e@gastify-staging.test"
START = date(2025, 11, 3)  # a Monday (2025-W45)
MERCHANT_PREFIX = "Demo "

# (merchant suffix, L2 store key) — rotated per transaction.
STORES = [
    ("Jumbo Centro", "Supermarket"),
    ("Almacen Doña Rosa", "Almacen"),
    ("Café Lastarria", "Restaurant"),
    ("Mini Vega", "Minimarket"),
    ("Mayorista 10", "Wholesale"),
    ("Feria Sábado", "OpenMarket"),
]
# (item label, L4 item key, base price CLP) — rotated per item slot.
ITEMS = [
    ("Palta Hass", "Produce", 3500),
    ("Posta Negra", "MeatSeafood", 7900),
    ("Marraqueta", "BreadPastry", 1200),
    ("Yogurt Natural", "DairyEggs", 2400),
    ("Arroz G1", "Pantry", 1900),
    ("Verduras Congeladas", "FrozenFoods", 2800),
]


async def main() -> None:
    dsn = os.environ["GASTIFY_SEED_DSN"]
    conn = await asyncpg.connect(dsn, timeout=20)
    try:
        env_guard = await conn.fetchval("SELECT current_database()")
        scope = await conn.fetchval(
            "SELECT ownership_scope_id FROM users WHERE email = $1", E2E_EMAIL
        )
        if scope is None:
            raise SystemExit(f"e2e user not found in {env_guard} — wrong DSN?")

        store_ids = {
            r["key"]: r["id"]
            for r in await conn.fetch("SELECT id, key FROM store_categories WHERE level = 2")
        }
        item_ids = {
            r["key"]: r["id"]
            for r in await conn.fetch("SELECT id, key FROM item_categories WHERE level = 4")
        }

        # Idempotent reset of prior demo rows.
        old = [
            r["id"]
            for r in await conn.fetch(
                "SELECT id FROM transactions WHERE ownership_scope_id=$1 AND merchant LIKE $2",
                scope,
                MERCHANT_PREFIX + "%",
            )
        ]
        if old:
            await conn.execute("DELETE FROM transaction_items WHERE transaction_id = ANY($1)", old)
            await conn.execute("DELETE FROM transactions WHERE id = ANY($1)", old)
        print(f"reset {len(old)} prior demo transactions")

        today = date.today()
        created = 0
        week_start = START
        week_index = 0
        while week_start <= today:
            # Three transactions per week: Monday, Wednesday, Saturday.
            for slot, day_offset in enumerate((0, 2, 5)):
                tx_date = week_start + timedelta(days=day_offset)
                if tx_date > today:
                    break
                merchant_name, store_key = STORES[(week_index + slot) % len(STORES)]
                txn_id = uuid.uuid4()
                # 2-3 items rotating through the catalog; deterministic by week+slot.
                n_items = 2 + (week_index + slot) % 2
                picked = [ITEMS[(week_index * 3 + slot + k) % len(ITEMS)] for k in range(n_items)]
                # Slight deterministic price wobble per week so series aren't flat.
                total = sum(p + (week_index % 5) * 137 for _, _, p in picked)
                await conn.execute(
                    """
                    INSERT INTO transactions (id, ownership_scope_id, transaction_date,
                        merchant, total_minor, currency, store_category_id,
                        store_category_source)
                    VALUES ($1, $2, $3, $4, $5, 'CLP', $6, 'user')
                    """,
                    txn_id,
                    scope,
                    tx_date,
                    MERCHANT_PREFIX + merchant_name,
                    total,
                    store_ids[store_key],
                )
                for label, item_key, price in picked:
                    await conn.execute(
                        """
                        INSERT INTO transaction_items (id, transaction_id, name,
                            total_price_minor, item_category_id, category_source)
                        VALUES ($1, $2, $3, $4, $5, 'user')
                        """,
                        uuid.uuid4(),
                        txn_id,
                        label,
                        price + (week_index % 5) * 137,
                        item_ids[item_key],
                    )
                created += 1
            week_start += timedelta(days=7)
            week_index += 1
        print(
            f"seeded {created} demo transactions across {week_index} weeks "
            f"({START} .. {today}) for scope {str(scope)[:8]}"
        )
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
