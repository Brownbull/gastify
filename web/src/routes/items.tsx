import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useItems, type ItemFilters, type ItemListRow } from "@/hooks/useItems";
import { useTransactions } from "@/hooks/useTransactions";
import { useItemCategories } from "@/hooks/useCategories";
import { useI18n } from "@/hooks/useI18n";
import { formatDate, formatMinorAmount } from "@/lib/format";
import { periodRange, type Grain } from "@/lib/periodRange";
import { PeriodControl } from "@/components/insights/PeriodControl";
import { HistoryItemRow, type AggregatedProduct } from "@/components/history/HistoryItemRow";
import { PixelIcon } from "@/components/shell/PixelIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { HistorySwitcher } from "@/components/history/HistorySwitcher";
import { HISTORY_SUBS, historySubLabelKey, type HistorySub } from "@/lib/historySubs";

export const Route = createFileRoute("/items")({
  validateSearch: (search: Record<string, unknown>): { sub: HistorySub } => {
    const sub = search.sub as HistorySub;
    return { sub: HISTORY_SUBS.includes(sub) ? sub : "products" };
  },
  component: HistoryHub,
});

/**
 * Historial hub (Phase 9 / DF2) — the 4th-tab hub. The header (AppLayout) shows
 * the active-subsection title + a 3-way switcher (?sub=); a shared PeriodControl
 * scopes every subsection. Ports design-lab HistoryScreen: Transacciones (period
 * transactions) · Productos (aggregated products) · Reportes.
 */
function HistoryHub() {
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const sub: HistorySub = HISTORY_SUBS.includes(search.sub as HistorySub) ? (search.sub as HistorySub) : "products";
  const { t } = useI18n();
  const [grain, setGrain] = useState<Grain>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-gt-12" data-testid="history-hub">
      {/* desktop page-header: the mobile shell header carries the title + switcher on small screens */}
      <div className="hidden items-center justify-between gap-gt-8 lg:flex">
        <h1 className="font-gt-display text-gt-3xl font-extrabold text-gt-ink">{t(historySubLabelKey(sub))}</h1>
        <HistorySwitcher active={sub} />
      </div>
      <PeriodControl grain={grain} anchor={anchor} onGrainChange={setGrain} onAnchorChange={setAnchor} />
      {sub === "products" ? (
        <ProductosSubview grain={grain} anchor={anchor} />
      ) : sub === "transactions" ? (
        <TransaccionesSubview grain={grain} anchor={anchor} />
      ) : (
        <ReportesSubview />
      )}
    </div>
  );
}

/** Group per-occurrence line items into products (by category + normalized name). */
function aggregate(items: ItemListRow[], catLabel: Map<string, string>): AggregatedProduct[] {
  const map = new Map<string, AggregatedProduct>();
  for (const it of items) {
    const catKey = it.item_category_key ?? undefined;
    const k = `${catKey ?? "?"}::${it.name.trim().toLowerCase()}`;
    let agg = map.get(k);
    if (!agg) {
      agg = {
        key: k,
        name: it.name,
        categoryKey: catKey,
        categoryLabel: catKey ? catLabel.get(catKey) : undefined,
        currency: it.currency,
        totalMinor: 0,
        count: 0,
        purchases: [],
      };
      map.set(k, agg);
    }
    agg.totalMinor += it.total_minor;
    agg.count += 1;
    agg.purchases.push(it);
  }
  return [...map.values()].sort((a, b) => b.totalMinor - a.totalMinor);
}

function ProductosSubview({ grain, anchor }: { grain: Grain; anchor: Date }) {
  const { t, locale } = useI18n();
  const range = periodRange(grain, anchor, locale);
  const [query, setQuery] = useState("");
  const filters: ItemFilters = { dateFrom: range.from, dateTo: range.to, search: query || undefined };
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage, error } = useItems(filters);

  const loaded = data?.pages.flatMap((p) => p.data) ?? [];
  // Auto-load every page in the period so the aggregation is complete (the period
  // filter bounds the volume; cap as a runaway guard).
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && loaded.length < 600) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, loaded.length]);

  const itemCats = useItemCategories();
  const catLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of itemCats.data ?? []) {
      m.set(c.key, (c.display_labels?.[locale] as string) ?? (c.display_labels?.en as string) ?? c.key);
    }
    return m;
  }, [itemCats.data, locale]);

  const products = useMemo(() => aggregate(loaded, catLabel), [loaded, catLabel]);
  const totalMinor = products.reduce((s, p) => s + p.totalMinor, 0);
  const currency = loaded[0]?.currency ?? "CLP";
  const busy = isLoading || hasNextPage;

  return (
    <div className="flex flex-col gap-gt-8" data-testid="items-screen">
      <label className="grid min-h-11 grid-cols-[24px_minmax(0,1fr)] items-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-8 shadow-gt-xs focus-within:ring-4 focus-within:ring-gt-primary/25">
        <PixelIcon name="action-search" size={22} />
        <span className="sr-only">{t("items.searchPlaceholder")}</span>
        <input
          type="search"
          data-testid="items-search-input"
          placeholder={t("items.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 bg-transparent font-gt-display text-gt-md font-extrabold text-gt-ink outline-none placeholder:font-medium placeholder:text-gt-ink-3"
        />
      </label>

      <p className="text-gt-sm font-bold text-gt-ink-2" data-testid="items-stat">
        {products.length} {t("items.title")} ·{" "}
        <span className="font-extrabold text-gt-primary">{formatMinorAmount(totalMinor, currency)}</span>
      </p>

      {error ? (
        <ErrorBanner message={t("items.loadError")} />
      ) : busy && products.length === 0 ? (
        <ProductsSkeleton />
      ) : products.length === 0 ? (
        <div data-testid={query ? "items-empty-filtered" : "items-empty"}>
          <EmptyState iconName="item-other" title={query ? t("items.emptyFiltered") : t("items.empty")} />
        </div>
      ) : (
        <section className="overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
          <div className="divide-y-2 divide-gt-line">
            {products.map((p) => (
              <HistoryItemRow key={p.key} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TransaccionesSubview({ grain, anchor }: { grain: Grain; anchor: Date }) {
  const { t, locale } = useI18n();
  const range = periodRange(grain, anchor, locale);
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage, error } = useTransactions({
    dateFrom: range.from,
    dateTo: range.to,
  });
  const txns = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="flex flex-col gap-gt-8" data-testid="history-transactions">
      {error ? (
        <ErrorBanner message={t("items.loadError")} />
      ) : isLoading ? (
        <ProductsSkeleton />
      ) : txns.length === 0 ? (
        <div data-testid="history-transactions-empty">
          <EmptyState iconName="nav-history" title={t("history.transactionsEmpty")} />
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
            <ul className="flex flex-col divide-y-2 divide-gt-line">
              {txns.map((txn) => (
                <li key={txn.id}>
                  <Link
                    to="/transactions/$transactionId"
                    params={{ transactionId: txn.id }}
                    data-testid="history-txn-row"
                    className="flex items-center gap-gt-10 px-gt-12 py-gt-10 transition hover:bg-gt-bg-3"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-bg-3">
                      <PixelIcon name="fin-receipt" size={22} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
                      <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{txn.merchant}</span>
                      <span className="text-gt-xs font-bold text-gt-ink-3">
                        {formatDate(txn.transaction_date)}
                        {txn.item_count > 0 ? ` · ${txn.item_count} ${t("home.items")}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-gt-display text-gt-md font-extrabold tabular-nums text-gt-ink">
                      {formatMinorAmount(txn.total_minor, txn.currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {hasNextPage && (
            <div className="flex justify-center pt-gt-2">
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-8 text-gt-sm font-extrabold text-gt-primary shadow-gt-xs transition hover:bg-gt-bg-3 disabled:opacity-50"
              >
                {isFetchingNextPage ? t("items.loading") : t("items.loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReportesSubview() {
  const { t } = useI18n();
  return (
    <div
      data-testid="history-reports"
      className="flex flex-col items-center gap-gt-10 rounded-gt-2xl border-2 border-dashed border-gt-line-strong bg-gt-surface p-gt-24 text-center"
    >
      <PixelIcon name="chart-pie" size={40} />
      <p className="text-gt-sm font-medium text-gt-ink-3">{t("history.reportsHint")}</p>
      <Link
        to="/reports"
        className="rounded-gt-lg border-2 border-gt-line-strong bg-gt-primary-soft px-gt-16 py-gt-8 font-gt-display text-gt-sm font-extrabold text-gt-primary shadow-gt-xs transition hover:-translate-y-0.5"
      >
        {t("history.openReports")} →
      </Link>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <section className="overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
      <ul className="flex flex-col divide-y-2 divide-gt-line" aria-busy="true" aria-label="Loading">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex items-center gap-gt-10 px-gt-12 py-gt-10">
            <span className="h-11 w-11 shrink-0 animate-pulse rounded-gt-lg bg-gt-bg-3" />
            <span className="flex flex-1 flex-col gap-gt-4">
              <span className="h-4 w-40 animate-pulse rounded-gt-md bg-gt-bg-3" />
              <span className="h-3 w-24 animate-pulse rounded-gt-md bg-gt-bg-3" />
            </span>
            <span className="h-4 w-16 shrink-0 animate-pulse rounded-gt-md bg-gt-bg-3" />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-gt-xl border-2 border-gt-error bg-gt-error/5 px-gt-16 py-gt-12" role="alert">
      <p className="text-gt-sm font-bold text-gt-error">{message}</p>
    </div>
  );
}
