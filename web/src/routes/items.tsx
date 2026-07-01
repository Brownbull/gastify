import { useMemo, useState, useDeferredValue, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useItems, type ItemFilters, type ItemListRow } from "@/hooks/useItems";
import { useStoreCategories, useItemCategories } from "@/hooks/useCategories";
import { useI18n } from "@/hooks/useI18n";
import { formatMinorAmount, formatDate } from "@/lib/format";
import { categoryTint } from "@/lib/chartData";
import { itemCategoryIcon } from "@/lib/categoryIcon";
import { PixelIcon } from "@/components/shell/PixelIcon";
import { IconTile } from "@/components/ui/IconTile";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const Route = createFileRoute("/items")({
  component: ItemsPage,
});

const inputClass =
  "rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-6 text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong";

function ItemsPage() {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState<ItemFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const deferredFilters = useDeferredValue(filters);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useItems(deferredFilters);

  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const hasFilters = Object.values(filters).some(Boolean);
  const secondaryCount = [filters.merchant, filters.storeCategoryId, filters.dateFrom, filters.dateTo].filter(
    Boolean,
  ).length;

  // item_category_key → localized label, for the per-row category chips.
  const itemCats = useItemCategories();
  const itemCatLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of itemCats.data ?? []) {
      const label = (c.display_labels?.[locale] as string) ?? (c.display_labels?.en as string) ?? c.key;
      map.set(c.key, label);
    }
    return map;
  }, [itemCats.data, locale]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-gt-12" data-testid="items-screen">
      <div>
        <h1 className="font-gt-display text-gt-3xl font-extrabold text-gt-ink">{t("items.title")}</h1>
        <p className="mt-gt-2 text-gt-sm font-medium text-gt-ink-2">{t("items.subtitle")}</p>
      </div>

      {/* search row + filter toggle (secondary facets collapse behind the button) */}
      <div className="flex flex-col gap-gt-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-gt-8">
          <label className="grid min-h-11 grid-cols-[24px_minmax(0,1fr)] items-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-8 shadow-gt-xs focus-within:ring-4 focus-within:ring-gt-primary/25">
            <PixelIcon name="action-search" size={22} />
            <span className="sr-only">{t("items.searchPlaceholder")}</span>
            <input
              type="search"
              data-testid="items-search-input"
              placeholder={t("items.searchPlaceholder")}
              value={filters.search ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
              className="min-w-0 bg-transparent font-gt-display text-gt-md font-extrabold text-gt-ink outline-none placeholder:font-medium placeholder:text-gt-ink-3"
            />
          </label>
          <button
            type="button"
            data-testid="items-filter-toggle"
            aria-expanded={filtersOpen}
            aria-label={t("items.filters")}
            onClick={() => setFiltersOpen((o) => !o)}
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 ${
              filtersOpen || secondaryCount > 0 ? "bg-gt-primary-soft text-gt-primary" : "bg-gt-surface text-gt-ink-2"
            }`}
          >
            <PixelIcon name="action-filter" size={22} />
            {secondaryCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-gt-pill border-2 border-gt-surface bg-gt-primary px-gt-2 text-[10px] font-extrabold leading-none text-white">
                {secondaryCount}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && <FilterPanel filters={filters} onChange={setFilters} />}
        <ActiveFilters filters={filters} onChange={setFilters} />
      </div>

      {error && <ErrorBanner message={t("items.loadError")} />}

      {isLoading ? (
        <ItemsSkeleton />
      ) : items.length === 0 ? (
        <div data-testid={hasFilters ? "items-empty-filtered" : "items-empty"}>
          <EmptyState
            iconName="item-other"
            title={hasFilters ? t("items.emptyFiltered") : t("items.empty")}
          />
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
            <p className="px-gt-12 pb-gt-6 pt-gt-10 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
              {items.length} {t("items.title")}
            </p>
            <ul className="flex flex-col divide-y-2 divide-gt-line">
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  categoryLabel={item.item_category_key ? itemCatLabel.get(item.item_category_key) : undefined}
                />
              ))}
            </ul>
          </section>
          {hasNextPage && (
            <div className="flex justify-center pt-gt-2">
              <Button
                variant="secondary"
                size="sm"
                data-testid="items-load-more"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? t("items.loading") : t("items.loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterPanel({
  filters,
  onChange,
}: {
  filters: ItemFilters;
  onChange: (filters: ItemFilters) => void;
}) {
  const { t } = useI18n();
  const { data: categories } = useStoreCategories();
  const update = (partial: Partial<ItemFilters>) => onChange({ ...filters, ...partial });

  return (
    <div
      data-testid="items-filter-panel"
      className="grid gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-xs sm:grid-cols-2"
    >
      <Field label={t("items.filterMerchant")}>
        <input
          type="text"
          data-testid="items-filter-merchant"
          value={filters.merchant ?? ""}
          onChange={(e) => update({ merchant: e.target.value || undefined })}
          className={inputClass}
        />
      </Field>

      <Field label={t("items.filterCategory")}>
        <select
          data-testid="items-filter-category"
          value={filters.storeCategoryId ?? ""}
          onChange={(e) => update({ storeCategoryId: e.target.value || undefined })}
          className={inputClass}
        >
          <option value="">{t("items.allCategories")}</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {(cat.display_labels?.en as string) ?? cat.key}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("items.filterFrom")}>
        <input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => update({ dateFrom: e.target.value || undefined })}
          className={inputClass}
        />
      </Field>

      <Field label={t("items.filterTo")}>
        <input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => update({ dateTo: e.target.value || undefined })}
          className={inputClass}
        />
      </Field>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-gt-2 ${className}`}>
      <span className="px-gt-2 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">{label}</span>
      {children}
    </label>
  );
}

function ActiveFilters({
  filters,
  onChange,
}: {
  filters: ItemFilters;
  onChange: (filters: ItemFilters) => void;
}) {
  const { t } = useI18n();
  const chips = Object.entries(filters).filter(([, v]) => Boolean(v)) as [keyof ItemFilters, string][];
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-gt-6" data-testid="items-active-filters">
      {chips.map(([key, value]) => (
        <button
          key={key}
          type="button"
          data-testid={`items-chip-${key}`}
          onClick={() => onChange({ ...filters, [key]: undefined })}
          className="inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary-soft px-gt-10 py-gt-2 text-gt-sm font-extrabold text-gt-primary transition hover:bg-gt-bg-3"
        >
          {value}
          <span aria-hidden>×</span>
        </button>
      ))}
      <button
        type="button"
        data-testid="items-clear-all"
        onClick={() => onChange({})}
        className="text-gt-sm font-bold text-gt-ink-2 underline"
      >
        {t("items.clearAll")}
      </button>
    </div>
  );
}

function ItemRow({ item, categoryLabel }: { item: ItemListRow; categoryLabel?: string }) {
  const key = item.item_category_key ?? undefined;
  const icon = itemCategoryIcon(key);
  const tint = key ? categoryTint(key) : undefined;

  return (
    <li
      data-testid="items-row"
      className="flex items-center gap-gt-10 px-gt-12 py-gt-10 transition hover:bg-gt-bg-3"
    >
      <IconTile size="md" icon={icon} tint={tint} />
      <div className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <Link
          to="/transactions/$transactionId"
          params={{ transactionId: item.transaction_id }}
          className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink hover:underline"
        >
          {item.name}
        </Link>
        <span className="flex min-w-0 flex-wrap items-center gap-gt-6 text-gt-xs font-bold text-gt-ink-3">
          {key && categoryLabel ? <CategoryChip label={categoryLabel} icon={icon} tint={tint ?? ""} size="sm" /> : null}
          <span className="truncate">{item.merchant}</span>
          <span aria-hidden>·</span>
          <span>{formatDate(item.transaction_date)}</span>
          {item.qty != null && item.qty > 1 && (
            <>
              <span aria-hidden>·</span>
              <span>×{item.qty}</span>
            </>
          )}
        </span>
      </div>
      <span className="shrink-0 font-gt-display text-gt-md font-extrabold tabular-nums text-gt-ink">
        {formatMinorAmount(item.total_minor, item.currency)}
      </span>
    </li>
  );
}

function ItemsSkeleton() {
  return (
    <section className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
      <ul className="flex flex-col divide-y-2 divide-gt-line" aria-busy="true" aria-label="Loading items">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex items-center gap-gt-10 px-gt-12 py-gt-10">
            <span className="h-11 w-11 shrink-0 animate-pulse rounded-gt-lg bg-gt-bg-3" />
            <span className="flex flex-1 flex-col gap-gt-4">
              <span className="h-4 w-40 animate-pulse rounded-gt-md bg-gt-bg-3" />
              <span className="h-3 w-28 animate-pulse rounded-gt-md bg-gt-bg-3" />
            </span>
            <span className="h-4 w-20 shrink-0 animate-pulse rounded-gt-md bg-gt-bg-3" />
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
