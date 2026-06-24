import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { CompactRow, CompactRowList } from "@design-system/molecules/CompactRowList";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import type { Platform } from "@design-system/organisms/AppSurface";
import { getCategoryToken } from "@lib/categoryTokens";
import { SEGMENTS, drillChildren, type SegmentDatum } from "@lib/analyticsFixtures";
import { BROWSE_TRANSACTIONS, type BrowseTransaction } from "@lib/browseFixtures";
import { clp } from "@lib/transactionFixtures";

/** mock month-over-month delta per rubro (negative = spent less); default -5. */
const TREND: Record<string, number> = {
  supermercados: -12,
  "transporte-vehiculo": 6,
  restaurantes: -4,
  "salud-bienestar": -8,
  vivienda: 2,
};

/** find a segment by id across the L1 rubros and their L2 children. */
function findSegment(id: string): SegmentDatum | undefined {
  const top = SEGMENTS.find((s) => s.id === id);
  if (top) return top;
  for (const s of SEGMENTS) {
    const kid = drillChildren(s.id)?.find((c) => c.id === id);
    if (kid) return kid;
  }
  return undefined;
}

export interface CategoryDetailScreenProps {
  categoryId: string;
  onBack?: () => void;
  platform?: Platform;
}

/**
 * CategoryDetailScreen — the drill-down report for one spending category (the
 * Gastos legend count-pill opens it): a summary (icon + total + share + trend),
 * the sub-category breakdown (drillChildren), and that category's transactions.
 */
export function CategoryDetailScreen({ categoryId, onBack, platform = "mobile" }: CategoryDetailScreenProps) {
  const token = getCategoryToken(categoryId);
  const seg = findSegment(categoryId);
  const children = drillChildren(categoryId) ?? [];
  const childMax = children.reduce((m, c) => Math.max(m, c.value), 0) || 1;
  const txns: BrowseTransaction[] = BROWSE_TRANSACTIONS.flatMap((g) => g.transactions).filter((t) => t.category === categoryId).slice(0, 5);
  const delta = TREND[categoryId] ?? -5;
  const down = delta <= 0;
  const contentMax = platform === "desktop" ? "44rem" : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title={token.label} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-12" style={{ maxWidth: contentMax }}>
          {/* summary */}
          <section className="flex flex-col items-center gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-16 shadow-gt-sm">
            <span className="grid h-16 w-16 place-items-center rounded-gt-2xl border-2 border-gt-line-strong" style={{ backgroundColor: token.tint }}>
              <PixelIcon name={token.icon} size={40} />
            </span>
            <div className="text-center">
              <h2 className="font-gt-display text-gt-xl font-extrabold text-gt-ink">{token.label}</h2>
              {seg ? (
                <p className="text-gt-sm font-bold text-gt-ink-3">
                  {seg.pct}% del total · {seg.count} transacciones · {seg.itemCount} ítems
                </p>
              ) : null}
            </div>
            <p className="font-gt-display text-gt-3xl font-extrabold text-gt-primary">{clp(seg?.value ?? 0)}</p>
            <span className={`inline-flex items-center gap-gt-4 rounded-gt-pill border-2 px-gt-10 py-gt-2 font-gt-display text-gt-xs font-extrabold ${down ? "border-gt-positive bg-gt-positive-bg text-gt-positive" : "border-gt-negative bg-gt-negative-bg text-gt-negative"}`}>
              <span aria-hidden="true">{down ? "▼" : "▲"}</span> {Math.abs(delta)}% vs mes anterior
            </span>
          </section>

          {/* sub-category breakdown */}
          {children.length > 0 ? (
            <section className="flex flex-col gap-gt-6">
              <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Desglose</p>
              <div className="flex flex-col gap-gt-2 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-sm">
                {children.map((c) => {
                  const ct = getCategoryToken(c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-gt-10 py-gt-6">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong" style={{ backgroundColor: ct.tint }}>
                        <PixelIcon name={ct.icon} size={22} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
                        <span className="flex items-baseline justify-between gap-gt-8">
                          <span className="min-w-0 truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{ct.label}</span>
                          <span className="shrink-0 font-gt-display text-gt-sm font-extrabold text-gt-ink">{clp(c.value)}</span>
                        </span>
                        <span className="h-2 w-full overflow-hidden rounded-gt-pill bg-gt-bg-3">
                          <span className="block h-full rounded-gt-pill bg-gt-primary" style={{ width: `${Math.round((c.value / childMax) * 100)}%` }} />
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* transactions in this category */}
          {txns.length > 0 ? (
            <section className="flex flex-col gap-gt-6">
              <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Movimientos</p>
              <CompactRowList>
                {txns.map((t) => (
                  <CompactRow
                    key={t.id}
                    leading={<ThumbnailBadge icon={t.storeIcon} category={t.category} />}
                    title={t.merchant}
                    meta={
                      <span className="flex items-center gap-gt-4 text-gt-xs font-medium text-gt-ink-2">
                        <PixelIcon name="chart-calendar" size={14} />
                        {t.time} · {t.location}
                      </span>
                    }
                    trailing={<span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(t.total)}</span>}
                  />
                ))}
              </CompactRowList>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
