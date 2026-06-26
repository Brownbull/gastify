import { useState, useDeferredValue } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useItems, type ItemFilters, type ItemListRow } from "@/hooks/useItems";
import { useStoreCategories } from "@/hooks/useCategories";
import { useI18n } from "@/hooks/useI18n";
import { formatMinorAmount, formatDate } from "@/lib/format";
import { categoryColorVar } from "@/lib/chartData";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconTile } from "@/components/ui/IconTile";
import { EmptyState } from "@/components/ui/EmptyState";

export const Route = createFileRoute("/items")({
  component: ItemsPage,
});

const inputClass =
  "rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-6 text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong";

function ItemsPage() {
  const { t } = useI18n();
  const [filters, setFilters] = useState<ItemFilters>({});
  const deferredFilters = useDeferredValue(filters);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useItems(deferredFilters);

  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-gt-16" data-testid="items-screen">
      <div>
        <h1 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">{t("items.title")}</h1>
        <p className="mt-gt-2 text-gt-sm font-medium text-gt-ink-2">{t("items.subtitle")}</p>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />
      <ActiveFilters filters={filters} onChange={setFilters} />

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
          <Card padded={false}>
            <div className="border-b-2 border-gt-line px-gt-12 py-gt-8">
              <span className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
                {items.length} {t("items.title")}
              </span>
            </div>
            <ul className="flex flex-col divide-y-2 divide-gt-line">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </ul>
          </Card>
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
    <fieldset className="flex flex-wrap items-end gap-gt-10 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-sm">
      <legend className="sr-only">{t("items.title")}</legend>

      <Field label={t("items.searchPlaceholder")} className="min-w-[12rem] flex-1">
        <input
          type="text"
          data-testid="items-search-input"
          placeholder={t("items.searchPlaceholder")}
          value={filters.search ?? ""}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className={inputClass}
        />
      </Field>

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
    </fieldset>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
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
  const chips = Object.entries(filters).filter(([, v]) => Boolean(v)) as [
    keyof ItemFilters,
    string,
  ][];
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

function ItemCard({ item }: { item: ItemListRow }) {
  const tint = item.item_category_key
    ? `color-mix(in srgb, ${categoryColorVar(item.item_category_key)} 22%, var(--surface))`
    : undefined;

  return (
    <li
      data-testid="items-row"
      className="flex items-center gap-gt-10 px-gt-12 py-gt-10 transition hover:bg-gt-bg-3"
    >
      <IconTile size="md" icon="item-other" tint={tint} />
      <div className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <Link
          to="/transactions/$transactionId"
          params={{ transactionId: item.transaction_id }}
          className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink hover:underline"
        >
          {item.name}
        </Link>
        <span className="flex flex-wrap items-center gap-gt-6 text-gt-xs font-bold text-gt-ink-3">
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
    <Card padded={false}>
      <ul className="flex flex-col divide-y-2 divide-gt-line" aria-busy="true" aria-label="Loading items">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex items-center gap-gt-10 px-gt-12 py-gt-10">
            <span className="h-11 w-11 shrink-0 animate-pulse rounded-gt-lg bg-gt-bg-3" />
            <span className="h-4 w-40 animate-pulse rounded-gt-md bg-gt-bg-3" />
            <span className="ml-auto h-4 w-20 animate-pulse rounded-gt-md bg-gt-bg-3" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-gt-xl border-2 border-gt-error bg-gt-error/5 px-gt-16 py-gt-12" role="alert">
      <p className="text-gt-sm font-bold text-gt-error">{message}</p>
    </div>
  );
}
