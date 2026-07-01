import { useState, useDeferredValue, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useTransactions,
  useBatchDeleteTransactions,
  useBatchUpdateTransactions,
  type TransactionFilters,
} from "@/hooks/useTransactions";
import { useStoreCategories } from "@/hooks/useCategories";
import { formatMinorAmount, formatDate } from "@/lib/format";
import type { components } from "@/lib/api-types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconTile } from "@/components/ui/IconTile";
import { EmptyState } from "@/components/ui/EmptyState";

type TransactionListItem = components["schemas"]["TransactionListItem"];

interface TransactionsSearch {
  dateFrom?: string;
  dateTo?: string;
}

export const Route = createFileRoute("/transactions/")({
  validateSearch: (search: Record<string, unknown>): TransactionsSearch => ({
    dateFrom: typeof search.dateFrom === "string" ? search.dateFrom : undefined,
    dateTo: typeof search.dateTo === "string" ? search.dateTo : undefined,
  }),
  component: TransactionsListPage,
});

const inputClass =
  "rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-6 text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong";

function TransactionsListPage() {
  const search = Route.useSearch();
  const [filters, setFilters] = useState<TransactionFilters>(() => ({
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
  }));
  const deferredFilters = useDeferredValue(filters);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useTransactions(deferredFilters);

  const transactions = data?.pages.flatMap((page) => page.data) ?? [];

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === transactions.length ? new Set() : new Set(transactions.map((t) => t.id)),
    );
  }, [transactions]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const allSelected = transactions.length > 0 && selected.size === transactions.length;

  return (
    <div className="space-y-gt-16">
      <div className="hidden lg:block">
        <h1 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">Transactions</h1>
        <p className="mt-gt-2 text-gt-sm font-medium text-gt-ink-2">View and manage your expense history.</p>
      </div>

      <div className="flex items-start justify-between gap-gt-12">
        <FilterBar filters={filters} onChange={setFilters} />
        <Link to="/transactions/new" data-testid="add-transaction-link" className="shrink-0">
          <Button size="sm">+ Add</Button>
        </Link>
      </div>

      {selected.size > 0 && (
        <BatchActionBar count={selected.size} selectedIds={[...selected]} onDone={clearSelection} />
      )}

      {error && <ErrorBanner message={error.message} />}

      {isLoading ? (
        <SkeletonList />
      ) : transactions.length === 0 ? (
        <EmptyState
          iconName="nav-history"
          title={Object.values(filters).some(Boolean) ? "No transactions match your filters" : "No transactions yet"}
          message={
            Object.values(filters).some(Boolean)
              ? "Try adjusting your date range or search terms."
              : "Scan a receipt to create your first transaction."
          }
        />
      ) : (
        <>
          <Card padded={false}>
            <div className="flex items-center gap-gt-10 border-b-2 border-gt-line px-gt-12 py-gt-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all transactions"
                data-testid="select-all-checkbox"
                className="h-5 w-5 accent-gt-primary"
              />
              <span className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
                {transactions.length} transactions
              </span>
            </div>
            <ul className="flex flex-col divide-y-2 divide-gt-line">
              {transactions.map((txn) => (
                <TransactionRow
                  key={txn.id}
                  txn={txn}
                  isSelected={selected.has(txn.id)}
                  onToggle={() => toggleSelect(txn.id)}
                />
              ))}
            </ul>
          </Card>
          {hasNextPage && (
            <div className="flex justify-center pt-gt-2">
              <Button variant="secondary" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface BatchActionBarProps {
  count: number;
  selectedIds: string[];
  onDone: () => void;
}

function BatchActionBar({ count, selectedIds, onDone }: BatchActionBarProps) {
  const batchDelete = useBatchDeleteTransactions();
  const batchUpdate = useBatchUpdateTransactions();
  const { data: categories } = useStoreCategories();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete ${count} transaction(s)?`)) return;
    await batchDelete.mutateAsync(selectedIds);
    onDone();
  }

  async function handleReassign(categoryId: string) {
    await batchUpdate.mutateAsync({
      transactionIds: selectedIds,
      updates: { store_category_id: categoryId },
    });
    setShowCategoryPicker(false);
    onDone();
  }

  return (
    <div
      className="flex flex-wrap items-center gap-gt-10 rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary-soft px-gt-16 py-gt-12 shadow-gt-sm"
      data-testid="batch-action-bar"
    >
      <span className="font-gt-display text-gt-sm font-extrabold text-gt-primary">{count} selected</span>
      <Button variant="danger" size="sm" onClick={() => void handleDelete()} disabled={batchDelete.isPending} data-testid="batch-delete-button">
        {batchDelete.isPending ? "Deleting..." : "Delete"}
      </Button>
      <div className="relative">
        <Button variant="secondary" size="sm" onClick={() => setShowCategoryPicker((v) => !v)} data-testid="batch-reassign-button">
          Reassign category
        </Button>
        {showCategoryPicker && categories && (
          <div className="absolute left-0 top-full z-10 mt-gt-2 max-h-60 w-56 overflow-y-auto rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface p-gt-4 shadow-gt-md">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => void handleReassign(cat.id)}
                className="block w-full rounded-gt-md px-gt-10 py-gt-8 text-left text-gt-sm font-bold text-gt-ink transition hover:bg-gt-bg-3"
              >
                {(cat.display_labels?.en as string) ?? cat.key}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onDone} className="ml-auto text-gt-sm font-bold text-gt-ink-2">
        Cancel
      </button>
    </div>
  );
}

interface FilterBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

function FilterBar({ filters, onChange }: FilterBarProps) {
  const update = (partial: Partial<TransactionFilters>) => onChange({ ...filters, ...partial });
  const { data: categories } = useStoreCategories();

  return (
    <fieldset className="flex flex-wrap items-end gap-gt-10 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-sm">
      <legend className="sr-only">Filter transactions</legend>
      <Field label="From">
        <input type="date" value={filters.dateFrom ?? ""} onChange={(e) => update({ dateFrom: e.target.value || undefined })} className={inputClass} />
      </Field>
      <Field label="To">
        <input type="date" value={filters.dateTo ?? ""} onChange={(e) => update({ dateTo: e.target.value || undefined })} className={inputClass} />
      </Field>
      <Field label="Merchant">
        <input type="text" placeholder="Search..." value={filters.merchant ?? ""} onChange={(e) => update({ merchant: e.target.value || undefined })} className={inputClass} />
      </Field>
      <Field label="Source">
        <select
          data-testid="filter-source"
          value={filters.source ?? ""}
          onChange={(e) => update({ source: (e.target.value || undefined) as TransactionFilters["source"] })}
          className={inputClass}
        >
          <option value="">All</option>
          <option value="scan">Scan</option>
          <option value="manual">Manual</option>
          <option value="statement">Statement</option>
        </select>
      </Field>
      <Field label="Statement match">
        <select
          data-testid="filter-matched"
          value={filters.matched === undefined ? "" : String(filters.matched)}
          onChange={(e) => update({ matched: e.target.value === "" ? undefined : e.target.value === "true" })}
          className={inputClass}
        >
          <option value="">All</option>
          <option value="true">Matched</option>
          <option value="false">Unmatched</option>
        </select>
      </Field>
      <Field label="Category">
        <select value={filters.category ?? ""} onChange={(e) => update({ category: e.target.value || undefined })} className={inputClass}>
          <option value="">All</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {(cat.display_labels?.en as string) ?? cat.key}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Currency">
        <input type="text" placeholder="CLP" maxLength={3} value={filters.currency ?? ""} onChange={(e) => update({ currency: e.target.value.toUpperCase() || undefined })} className={`${inputClass} w-20 uppercase`} />
      </Field>
      {Object.values(filters).some(Boolean) && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          Clear
        </Button>
      )}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-gt-2">
      <span className="px-gt-2 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">{label}</span>
      {children}
    </label>
  );
}

interface TransactionRowProps {
  txn: TransactionListItem;
  isSelected: boolean;
  onToggle: () => void;
}

function TransactionRow({ txn, isSelected, onToggle }: TransactionRowProps) {
  const isEdited = txn.merchant_user_edited_at != null || txn.store_category_user_edited_at != null;

  return (
    <li className={`flex items-center gap-gt-10 px-gt-12 py-gt-10 transition hover:bg-gt-bg-3 ${isSelected ? "bg-gt-primary-soft" : ""}`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        aria-label={`Select ${txn.merchant}`}
        data-testid={`select-txn-${txn.id}`}
        className="h-5 w-5 shrink-0 accent-gt-primary"
      />
      <IconTile icon="nav-history" size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className="flex items-center gap-gt-6">
          <Link
            to="/transactions/$transactionId"
            params={{ transactionId: txn.id }}
            className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink hover:underline"
          >
            {txn.merchant}
          </Link>
          {isEdited && <span className="shrink-0 text-gt-xs font-bold text-gt-secondary" title="User edited">(edited)</span>}
          {txn.alias && <span className="shrink-0 truncate text-gt-xs font-medium text-gt-ink-3">{txn.alias}</span>}
        </span>
        <span className="flex flex-wrap items-center gap-gt-6 text-gt-xs font-bold text-gt-ink-3">
          <span>{formatDate(txn.transaction_date)}</span>
          <span aria-hidden>·</span>
          <span>{txn.item_count} items</span>
          {txn.amount_usd_minor != null && (
            <>
              <span aria-hidden>·</span>
              <span>{formatMinorAmount(txn.amount_usd_minor, "USD")}</span>
            </>
          )}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-gt-2">
        <span className="font-gt-display text-gt-md font-extrabold tabular-nums text-gt-ink">
          {formatMinorAmount(txn.total_minor, txn.currency)}
        </span>
        <span className="flex items-center gap-gt-4">
          {txn.statement_matched && (
            <span data-testid="txn-matched-badge">
              <Badge tone="positive">✓ Matched</Badge>
            </span>
          )}
          {txn.receipt_type && <Badge tone="neutral">{txn.receipt_type}</Badge>}
        </span>
      </div>
    </li>
  );
}

function SkeletonList() {
  return (
    <Card padded={false}>
      <ul className="flex flex-col divide-y-2 divide-gt-line" aria-busy="true" aria-label="Loading transactions">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="flex items-center gap-gt-10 px-gt-12 py-gt-10">
            <span className="h-11 w-11 shrink-0 animate-pulse rounded-gt-lg bg-gt-bg-3" />
            <span className="h-4 w-40 animate-pulse rounded-gt-md bg-gt-bg-3" />
            <span className="ml-auto h-4 w-24 animate-pulse rounded-gt-md bg-gt-bg-3" />
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
