import { useState, useDeferredValue } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useTransactions,
  type TransactionFilters,
} from "@/hooks/useTransactions";
import { useStoreCategories } from "@/hooks/useCategories";
import { formatMinorAmount, formatDate } from "@/lib/format";
import type { components } from "@/lib/api-types";

type TransactionListItem = components["schemas"]["TransactionListItem"];

export const Route = createFileRoute("/transactions/")({
  component: TransactionsListPage,
});

function TransactionsListPage() {
  const [filters, setFilters] = useState<TransactionFilters>({});
  const deferredFilters = useDeferredValue(filters);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useTransactions(deferredFilters);

  const transactions = data?.pages.flatMap((page) => page.data) ?? [];

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

      {error && <ErrorBanner message={error.message} />}

      {isLoading ? (
        <SkeletonTable />
      ) : transactions.length === 0 ? (
        <EmptyState hasFilters={Object.values(filters).some(Boolean)} />
      ) : (
        <>
          <TransactionTable transactions={transactions} />
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
}

function TransactionTable({ transactions }: TransactionTableProps) {
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
            <th
              scope="col"
              className="px-4 py-3 font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Date
            </th>
            <th
              scope="col"
              className="px-4 py-3 font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Merchant
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Amount
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-right font-medium sm:table-cell"
              style={{ color: "var(--text-muted)" }}
            >
              USD
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 text-center font-medium md:table-cell"
              style={{ color: "var(--text-muted)" }}
            >
              Items
            </th>
            <th
              scope="col"
              className="hidden px-4 py-3 font-medium lg:table-cell"
              style={{ color: "var(--text-muted)" }}
            >
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <TransactionRow key={txn.id} txn={txn} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionRow({ txn }: { txn: TransactionListItem }) {
  const isEdited =
    txn.merchant_user_edited_at != null ||
    txn.store_category_user_edited_at != null;

  return (
    <tr
      className="border-b transition-colors last:border-b-0 hover:bg-[var(--primary-light)]"
      style={{ borderColor: "var(--border)" }}
    >
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
