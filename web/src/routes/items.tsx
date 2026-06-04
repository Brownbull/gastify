import { useState, useDeferredValue } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useItems, type ItemFilters, type ItemListRow } from "@/hooks/useItems";
import { useStoreCategories } from "@/hooks/useCategories";
import { useI18n } from "@/hooks/useI18n";
import { formatMinorAmount, formatDate } from "@/lib/format";
import { categoryColorVar } from "@/lib/chartData";

export const Route = createFileRoute("/items")({
  component: ItemsPage,
});

function ItemsPage() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<ItemFilters>({});
  const deferredFilters = useDeferredValue(filters);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useItems(deferredFilters);

  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6" data-testid="items-screen">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
          {t("items.title")}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("items.subtitle")}
        </p>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />
      <ActiveFilters filters={filters} onChange={setFilters} />

      {error && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--error)",
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
          }}
          role="alert"
        >
          <p className="text-sm font-medium" style={{ color: "var(--error)" }}>
            {t("items.loadError")}
          </p>
        </div>
      )}

      {isLoading ? (
        <ItemsSkeleton />
      ) : items.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ul>
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                data-testid="items-load-more"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-lg px-6 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ color: "var(--primary)", backgroundColor: "var(--primary-light)" }}
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

function FilterBar({
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
    <fieldset
      className="flex flex-wrap gap-3 rounded-lg border p-4"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <legend className="sr-only">{t("items.title")}</legend>

      <label className="flex flex-1 flex-col gap-1" style={{ minWidth: "12rem" }}>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("items.searchPlaceholder")}
        </span>
        <input
          type="text"
          data-testid="items-search-input"
          placeholder={t("items.searchPlaceholder")}
          value={filters.search ?? ""}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text)",
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("items.filterMerchant")}
        </span>
        <input
          type="text"
          data-testid="items-filter-merchant"
          value={filters.merchant ?? ""}
          onChange={(e) => update({ merchant: e.target.value || undefined })}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text)",
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("items.filterCategory")}
        </span>
        <select
          data-testid="items-filter-category"
          value={filters.storeCategoryId ?? ""}
          onChange={(e) => update({ storeCategoryId: e.target.value || undefined })}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text)",
          }}
        >
          <option value="">{t("items.allCategories")}</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {(cat.display_labels?.en as string) ?? cat.key}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("items.filterFrom")}
        </span>
        <input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => update({ dateFrom: e.target.value || undefined })}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text)",
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("items.filterTo")}
        </span>
        <input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => update({ dateTo: e.target.value || undefined })}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text)",
          }}
        />
      </label>
    </fieldset>
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
  const chips = Object.entries(filters).filter(([, v]) => Boolean(v)) as [
    keyof ItemFilters,
    string,
  ][];
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="items-active-filters">
      {chips.map(([key, value]) => (
        <button
          key={key}
          type="button"
          data-testid={`items-chip-${key}`}
          onClick={() => onChange({ ...filters, [key]: undefined })}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
          style={{ color: "var(--primary)", backgroundColor: "var(--primary-light)" }}
        >
          {value}
          <span aria-hidden>×</span>
        </button>
      ))}
      <button
        type="button"
        data-testid="items-clear-all"
        onClick={() => onChange({})}
        className="text-xs"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("items.clearAll")}
      </button>
    </div>
  );
}

function ItemCard({ item }: { item: ItemListRow }) {
  return (
    <li
      data-testid="items-row"
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-(--primary-light)"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor: item.item_category_key
              ? categoryColorVar(item.item_category_key)
              : "var(--border)",
          }}
        />
        <div className="min-w-0">
          <Link
            to="/transactions/$transactionId"
            params={{ transactionId: item.transaction_id }}
            className="truncate font-medium hover:underline"
            style={{ color: "var(--text)" }}
          >
            {item.name}
          </Link>
          <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
            {item.merchant} · {formatDate(item.transaction_date)}
            {item.qty != null && item.qty > 1 ? ` · ×${item.qty}` : ""}
          </p>
        </div>
      </div>
      <span
        className="shrink-0 text-sm font-medium tabular-nums"
        style={{ color: "var(--text)" }}
      >
        {formatMinorAmount(item.total_minor, item.currency)}
      </span>
    </li>
  );
}

function ItemsSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border p-3"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="h-4 w-40 animate-pulse rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div
            className="h-4 w-20 animate-pulse rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const { t } = useI18n();
  return (
    <div
      className="rounded-lg border p-12 text-center"
      data-testid={hasFilters ? "items-empty-filtered" : "items-empty"}
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {hasFilters ? t("items.emptyFiltered") : t("items.empty")}
      </p>
    </div>
  );
}
