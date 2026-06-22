import { PixelIcon } from "@design-system/assets/PixelIcon";
import { MapPinIcon } from "@design-system/assets/icons";
import { Badge } from "@design-system/atoms/Badge";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { CompactRow, CompactRowList } from "@design-system/molecules/CompactRowList";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import type { HomeTransaction } from "../model/HomeScreenModel";

/** date · location (the item count moves to the expand control). */
function MetaLine({ t }: { t: HomeTransaction }) {
  return (
    <>
      <PixelIcon name="chart-calendar" size={12} />
      <span className="text-gt-xs font-bold">{t.date}</span>
      <span className="text-gt-line-strong">·</span>
      <MapPinIcon className="h-3 w-3" />
      <span className="text-gt-xs font-bold">{t.location}</span>
    </>
  );
}

/** category chip, then the duplicate flag on its own line below it. */
function Tags({ t }: { t: HomeTransaction }) {
  return (
    <>
      <CategoryChip category={t.category} size="sm" />
      {t.badge ? <Badge tone={t.badge.tone}>{t.badge.label}</Badge> : null}
    </>
  );
}

function ItemDetail({ t }: { t: HomeTransaction }) {
  if (!t.firstItem) return null;
  return (
    <div className="flex items-center gap-3 rounded-gt-lg bg-gt-bg-3 px-3 py-2">
      <PixelIcon name={t.thumbnail} size={24} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-gt-sm font-bold text-gt-ink">{t.firstItem.name}</span>
        <span className="text-gt-xs font-semibold text-gt-ink-3">{t.firstItem.qty}× · {t.firstItem.price}</span>
      </div>
      {t.items > 1 ? (
        <button type="button" className="text-gt-sm font-extrabold text-gt-primary hover:underline">Ver más</button>
      ) : null}
    </div>
  );
}

export function RecentTransactionsCard({ transactions }: { transactions: HomeTransaction[] }) {
  return (
    // BARE (no Card box) — the list goes edge-to-edge so it uses the full
    // section width. Only the hero + insight keep an elevated container.
    <section className="flex flex-col gap-gt-8">
      <div className="flex items-center justify-between gap-gt-8">
        <h3 className="text-gt-lg font-extrabold text-gt-ink">Recientes</h3>
        {transactions.length > 0 ? (
          <a href="#" onClick={(e) => e.preventDefault()} className="text-gt-sm font-extrabold text-gt-primary">
            Ver todo →
          </a>
        ) : null}
      </div>
      {transactions.length === 0 ? (
        <p className="py-6 text-center text-gt-md text-gt-ink-3">
          Escanea tu primera boleta para ver tus compras aquí.
        </p>
      ) : (
        <CompactRowList>
          {transactions.map((t) => (
            <CompactRow
              key={t.merchant}
              className="px-gt-0!"
              leading={<ThumbnailBadge icon={t.thumbnail} category={t.category} />}
              title={t.merchant}
              meta={<MetaLine t={t} />}
              tags={<Tags t={t} />}
              trailing={<span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t.amount}</span>}
              detailLabel={`${t.items} ${t.items === 1 ? "ítem" : "ítems"}`}
              detail={<ItemDetail t={t} />}
            />
          ))}
        </CompactRowList>
      )}
    </section>
  );
}
