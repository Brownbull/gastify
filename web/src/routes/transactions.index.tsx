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

type TransactionListItem = components["schemas"]["TransactionListItem"];

/** URL search for deep-linking the list pre-filtered (e.g. the Reports "view
 *  transactions" drill seeds a period's date range). */
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

function TransactionsListPage() {
  const search = Route.useSearch();
  // Seed the filter from the URL (drill-in), then it's local component state.
  const [filters, setFilters] = useState<TransactionFilters>(() => ({
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
  }));
  const deferredFilters = useDeferredValue(filters);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useTransactions(deferredFilters);

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
      prev.size === transactions.length
        ? new Set()
        : new Set(transactions.map((t) => t.id)),
    );
  }, [transactions]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text)" }}
        >
          Transactions
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          View and manage your expense history.
        </p>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      {selected.size > 0 && (
        <BatchActionBar
          count={selected.size}
          selectedIds={[...selected]}
          onDone={clearSelection}
        />
      )}

      {error && <ErrorBanner message={error.message} />}

      {isLoading ? (
        <SkeletonTable />
      ) : transactions.length === 0 ? (
        <EmptyState hasFilters={Object.values(filters).some(Boolean)} />
      ) : (
        <>
          <TransactionTable
            transactions={transactions}
            selected={selected}
            onToggle={toggleSelect}
            onToggleAll={toggleAll}
          />
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-lg px-6 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  color: "var(--primary)",
                  backgroundColor: "var(--primary-light)",
                }}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
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
      className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
      style={{
        backgroundColor: "var(--primary-light)",
        borderColor: "var(--primary)",
      }}
      data-testid="batch-action-bar"
    >
      <span className="text-sm font-medium" style={{ color: "var(--primary)" }}>
        {count} selected
      </span>

      <button
        onClick={() => void handleDelete()}
        disabled={batchDelete.isPending}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
        style={{ backgroundColor: "var(--error)" }}
        data-testid="batch-delete-button"
      >
        {batchDelete.isPending ? "Deleting..." : "Delete"}
      </button>

      <div className="relative">
        <button
          onClick={() => setShowCategoryPicker((v) => !v)}
          className="rounded-md border px-3 py-1.5 text-sm font-medium"
          style={{
            borderColor: "var(--primary)",
            color: "var(--primary)",
          }}
          data-testid="batch-reassign-button"
        >
          Reassign category
        </button>
        {showCategoryPicker && categories && (
          <div
            className="absolute left-0 top-full z-10 mt-1 max-h-60 w-56 overflow-y-auto rounded-lg border shadow-lg"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => void handleReassign(cat.id)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-(--primary-light)"
                style={{ color: "var(--text)" }}
              >
                {(cat.display_labels?.en as string) ?? cat.key}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onDone}
        className="ml-auto text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
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
  const update = (partial: Partial<TransactionFilters>) =>
    onChange({ ...filters, ...partial });
  const { data: categories } = useStoreCategories();

  return (
    <fieldset
      className="flex flex-wrap gap-3 rounded-lg border p-4"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <legend className="sr-only">Filter transactions</legend>

      <label className="flex flex-col gap-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          From
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
          To
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

      <label className="flex flex-col gap-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Merchant
        </span>
        <input
          type="text"
          placeholder="Search..."
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
          Category
        </span>
        <select
          value={filters.category ?? ""}
          onChange={(e) => update({ category: e.target.value || undefined })}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text)",
          }}
        >
          <option value="">All</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {(cat.display_labels?.en as string) ?? cat.key}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Currency
        </span>
        <input
          type="text"
          placeholder="e.g. CLP"
          maxLength={3}
          value={filters.currency ?? ""}
          onChange={(e) =>
            update({ currency: e.target.value.toUpperCase() || undefined })
          }
          className="w-20 rounded-md border px-3 py-1.5 text-sm uppercase"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text)",
          }}
        />
      </label>

      {Object.values(filters).some(Boolean) && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="self-end rounded-md px-3 py-1.5 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Clear
        </button>
      )}
    </fieldset>
  );
}

interface TransactionTableProps {
  transactions: readonly TransactionListItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

function TransactionTable({
  transactions,
  selected,
  onToggle,
  onToggleAll,
}: TransactionTableProps) {
  const allSelected = transactions.length > 0 && selected.size === transactions.length;

  return (
    <div
      className="overflow-x-auto rounded-lg border"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr
            className="border-b text-left"
            style={{ borderColor: "var(--border)" }}
          >
            <th scope="col" className="w-10 px-3 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all transactions"
                data-testid="select-all-checkbox"
              />
            </th>
            <th scope="col" className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>
              Date
            </th>
            <th scope="col" className="px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>
              Merchant
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium" style={{ color: "var(--text-muted)" }}>
              Amount
            </th>
            <th scope="col" className="hidden px-4 py-3 text-right font-medium sm:table-cell" style={{ color: "var(--text-muted)" }}>
              USD
            </th>
            <th scope="col" className="hidden px-4 py-3 text-center font-medium md:table-cell" style={{ color: "var(--text-muted)" }}>
              Items
            </th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell" style={{ color: "var(--text-muted)" }}>
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <TransactionRow
              key={txn.id}
              txn={txn}
              isSelected={selected.has(txn.id)}
              onToggle={() => onToggle(txn.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TransactionRowProps {
  txn: TransactionListItem;
  isSelected: boolean;
  onToggle: () => void;
}

function TransactionRow({ txn, isSelected, onToggle }: TransactionRowProps) {
  const isEdited =
    txn.merchant_user_edited_at != null ||
    txn.store_category_user_edited_at != null;

  return (
    <tr
      className="border-b transition-colors last:border-b-0 hover:bg-(--primary-light)"
      style={{
        borderColor: "var(--border)",
        backgroundColor: isSelected ? "var(--primary-light)" : undefined,
      }}
    >
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          aria-label={`Select ${txn.merchant}`}
          data-testid={`select-txn-${txn.id}`}
        />
      </td>
      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
        {formatDate(txn.transaction_date)}
      </td>
      <td className="px-4 py-3">
        <Link
          to="/transactions/$transactionId"
          params={{ transactionId: txn.id }}
          className="font-medium hover:underline"
          style={{ color: "var(--text)" }}
        >
          {txn.merchant}
        </Link>
        {isEdited && (
          <span
            className="ml-1.5 text-xs"
            style={{ color: "var(--secondary)" }}
            title="User edited"
          >
            (edited)
          </span>
        )}
        {txn.alias && (
          <span
            className="ml-1.5 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {txn.alias}
          </span>
        )}
      </td>
      <td
        className="px-4 py-3 text-right font-medium tabular-nums"
        style={{ color: "var(--text)" }}
      >
        {formatMinorAmount(txn.total_minor, txn.currency)}
      </td>
      <td
        className="hidden px-4 py-3 text-right tabular-nums sm:table-cell"
        style={{ color: "var(--text-muted)" }}
      >
        {txn.amount_usd_minor != null
          ? formatMinorAmount(txn.amount_usd_minor, "USD")
          : "—"}
      </td>
      <td
        className="hidden px-4 py-3 text-center md:table-cell"
        style={{ color: "var(--text-muted)" }}
      >
        {txn.item_count}
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        {txn.statement_matched && (
          <span
            data-testid="txn-matched-badge"
            className="mr-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ color: "var(--success, #15803d)", backgroundColor: "var(--success-light, #dcfce7)" }}
            title="Matched against a card statement"
          >
            ✓ Matched
          </span>
        )}
        {txn.receipt_type && (
          <span
            className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              color: "var(--primary)",
              backgroundColor: "var(--primary-light)",
            }}
          >
            {txn.receipt_type}
          </span>
        )}
      </td>
    </tr>
  );
}

function SkeletonTable() {
  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
      aria-busy="true"
      aria-label="Loading transactions"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="h-4 w-20 animate-pulse rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div
            className="h-4 w-32 animate-pulse rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div
            className="ml-auto h-4 w-24 animate-pulse rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div
      className="rounded-lg border p-12 text-center"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <p
        className="text-lg font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {hasFilters
          ? "No transactions match your filters"
          : "No transactions yet"}
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
        {hasFilters
          ? "Try adjusting your date range or search terms."
          : "Scan a receipt to create your first transaction."}
      </p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: "var(--error)",
        backgroundColor:
          "color-mix(in srgb, var(--error) 10%, transparent)",
      }}
      role="alert"
    >
      <p
        className="text-sm font-medium"
        style={{ color: "var(--error)" }}
      >
        {message}
      </p>
    </div>
  );
}
