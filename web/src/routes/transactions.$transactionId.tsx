import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useTransaction,
  useUpdateTransaction,
} from "@/hooks/useTransactions";
import { useStoreCategories } from "@/hooks/useCategories";
import { formatMinorAmount, formatDate } from "@/lib/format";
import type { components } from "@/lib/api-types";

type TransactionDetail = components["schemas"]["TransactionDetail"];
type TransactionItemResponse = components["schemas"]["TransactionItemResponse"];

export const Route = createFileRoute("/transactions/$transactionId")({
  component: TransactionDetailPage,
});

function TransactionDetailPage() {
  const { transactionId } = Route.useParams();
  const { data: txn, isLoading, error } = useTransaction(transactionId);
  const mutation = useUpdateTransaction(transactionId);

  if (isLoading) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div
          className="rounded-lg border p-6 text-center"
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
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!txn) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackLink />
        <div>
          <EditableText
            value={txn.merchant}
            onSave={(v) => mutation.mutate({ merchant: v })}
            className="text-2xl font-semibold"
            editedAt={txn.merchant_user_edited_at}
          />
          <EditableDate
            value={txn.transaction_date}
            onSave={(v) => mutation.mutate({ transaction_date: v })}
          />
        </div>
      </div>

      {mutation.error && (
        <div
          className="flex items-center justify-between rounded-lg border px-4 py-3"
          style={{
            borderColor: "var(--error)",
            backgroundColor:
              "color-mix(in srgb, var(--error) 10%, transparent)",
          }}
          role="alert"
        >
          <p className="text-sm" style={{ color: "var(--error)" }}>
            {mutation.error.message}
          </p>
          <button
            onClick={() => mutation.reset()}
            className="text-xs font-medium underline"
            style={{ color: "var(--error)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      <SummaryCard txn={txn} onCategoryChange={(id) => mutation.mutate({ store_category_id: id })} />

      {txn.items.length > 0 && <ItemsTable txn={txn} />}

      {txn.images.length > 0 && <ImagesSection images={txn.images} />}

      <MetadataSection txn={txn} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/transactions"
      className="inline-flex items-center gap-1 text-sm font-medium"
      style={{ color: "var(--primary)" }}
    >
      <span aria-hidden="true">&larr;</span> Back
    </Link>
  );
}

function SummaryCard({
  txn,
  onCategoryChange,
}: {
  txn: TransactionDetail;
  onCategoryChange: (id: string) => void;
}) {
  const isEdited =
    txn.merchant_user_edited_at != null ||
    txn.store_category_user_edited_at != null;

  return (
    <div
      className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2 lg:grid-cols-4"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <Field label="Total">
        <span className="text-lg font-semibold tabular-nums">
          {formatMinorAmount(txn.total_minor, txn.currency)}
        </span>
      </Field>

      <Field label="USD equivalent">
        <span className="tabular-nums">
          {txn.amount_usd_minor != null
            ? formatMinorAmount(txn.amount_usd_minor, "USD")
            : "—"}
        </span>
        {txn.fx_rate_to_usd && (
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {" "}
            @ {txn.fx_rate_to_usd}
          </span>
        )}
      </Field>

      <Field label="Merchant">
        <span>{txn.merchant}</span>
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
      </Field>

      <EditableCategory
        value={txn.store_category_id ?? undefined}
        onSave={onCategoryChange}
        editedAt={txn.store_category_user_edited_at}
      />

      <Field label="Receipt type">
        {txn.receipt_type ? (
          <span
            className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              color: "var(--primary)",
              backgroundColor: "var(--primary-light)",
            }}
          >
            {txn.receipt_type}
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </Field>

      {txn.country && (
        <Field label="Location">
          <span>
            {txn.city ? `${txn.city}, ${txn.country}` : txn.country}
          </span>
        </Field>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <div style={{ color: "var(--text)" }}>{children}</div>
    </div>
  );
}

function ItemsTable({ txn }: { txn: TransactionDetail }) {
  return (
    <div
      className="overflow-x-auto rounded-lg border"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="px-5 pt-4 pb-2">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--text)" }}
        >
          Line items ({txn.items.length})
        </h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr
            className="border-b text-left"
            style={{ borderColor: "var(--border)" }}
          >
            <th
              scope="col"
              className="px-5 py-2 font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Item
            </th>
            <th
              scope="col"
              className="hidden px-5 py-2 text-center font-medium sm:table-cell"
              style={{ color: "var(--text-muted)" }}
            >
              Qty
            </th>
            <th
              scope="col"
              className="hidden px-5 py-2 text-right font-medium sm:table-cell"
              style={{ color: "var(--text-muted)" }}
            >
              Unit price
            </th>
            <th
              scope="col"
              className="px-5 py-2 text-right font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Total
            </th>
            <th
              scope="col"
              className="hidden px-5 py-2 font-medium md:table-cell"
              style={{ color: "var(--text-muted)" }}
            >
              Category
            </th>
          </tr>
        </thead>
        <tbody>
          {txn.items.map((item) => (
            <ItemRow key={item.id} item={item} currency={txn.currency} />
          ))}
        </tbody>
        <tfoot>
          <tr
            className="border-t font-medium"
            style={{ borderColor: "var(--border)" }}
          >
            <td
              className="px-5 py-3"
              colSpan={3}
              style={{ color: "var(--text)" }}
            >
              Total
            </td>
            <td
              className="px-5 py-3 text-right tabular-nums"
              style={{ color: "var(--text)" }}
            >
              {formatMinorAmount(txn.total_minor, txn.currency)}
            </td>
            <td className="hidden md:table-cell" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ItemRow({
  item,
  currency,
}: {
  item: TransactionItemResponse;
  currency: string;
}) {
  const isEdited =
    item.name_user_edited_at != null ||
    item.item_category_user_edited_at != null;

  return (
    <tr
      className="border-b last:border-b-0"
      style={{ borderColor: "var(--border)" }}
    >
      <td className="px-5 py-2.5" style={{ color: "var(--text)" }}>
        {item.name}
        {isEdited && (
          <span
            className="ml-1.5 text-xs"
            style={{ color: "var(--secondary)" }}
            title="User edited"
          >
            (edited)
          </span>
        )}
        {item.is_flagged && (
          <span
            className="ml-1.5 text-xs"
            style={{ color: "var(--warning, var(--secondary))" }}
            title="Flagged for review"
          >
            (flagged)
          </span>
        )}
      </td>
      <td
        className="hidden px-5 py-2.5 text-center tabular-nums sm:table-cell"
        style={{ color: "var(--text-muted)" }}
      >
        {item.qty ?? "—"}
      </td>
      <td
        className="hidden px-5 py-2.5 text-right tabular-nums sm:table-cell"
        style={{ color: "var(--text-muted)" }}
      >
        {item.unit_price_minor != null
          ? formatMinorAmount(item.unit_price_minor, currency)
          : "—"}
      </td>
      <td
        className="px-5 py-2.5 text-right tabular-nums"
        style={{ color: "var(--text)" }}
      >
        {formatMinorAmount(item.total_price_minor, currency)}
      </td>
      <td
        className="hidden px-5 py-2.5 md:table-cell"
        style={{ color: "var(--text-muted)" }}
      >
        {item.subcategory ?? "—"}
      </td>
    </tr>
  );
}

function ImagesSection({
  images,
}: {
  images: components["schemas"]["TransactionImageResponse"][];
}) {
  return (
    <div
      className="rounded-lg border p-5"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <h2
        className="mb-3 text-sm font-semibold"
        style={{ color: "var(--text)" }}
      >
        Receipt images ({images.length})
      </h2>
      <div className="flex flex-wrap gap-3">
        {images.map((img) => (
          <a
            key={img.id}
            href={img.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--border)" }}
          >
            <img
              src={img.image_url}
              alt={`Receipt image ${img.sort_order + 1}`}
              className="h-32 w-auto object-cover"
              loading="lazy"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

function MetadataSection({ txn }: { txn: TransactionDetail }) {
  const hasProcessingMeta =
    txn.scan_duration_ms != null ||
    txn.llm_latency_ms != null ||
    txn.llm_tokens_in != null;

  if (!hasProcessingMeta) return null;

  return (
    <details
      className="rounded-lg border"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <summary
        className="cursor-pointer px-5 py-3 text-sm font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        Processing metadata
      </summary>
      <div
        className="grid gap-3 border-t px-5 py-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ borderColor: "var(--border)" }}
      >
        {txn.scan_duration_ms != null && (
          <MetaField label="Scan duration" value={`${txn.scan_duration_ms}ms`} />
        )}
        {txn.llm_latency_ms != null && (
          <MetaField label="LLM latency" value={`${txn.llm_latency_ms}ms`} />
        )}
        {txn.queue_wait_ms != null && (
          <MetaField label="Queue wait" value={`${txn.queue_wait_ms}ms`} />
        )}
        {txn.thumbnail_gen_ms != null && (
          <MetaField label="Thumbnail gen" value={`${txn.thumbnail_gen_ms}ms`} />
        )}
        {txn.llm_tokens_in != null && (
          <MetaField label="Tokens in" value={txn.llm_tokens_in.toLocaleString()} />
        )}
        {txn.llm_tokens_out != null && (
          <MetaField label="Tokens out" value={txn.llm_tokens_out.toLocaleString()} />
        )}
        {txn.llm_cost_usd != null && (
          <MetaField label="LLM cost" value={`$${txn.llm_cost_usd}`} />
        )}
      </div>
    </details>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span
        className="text-sm tabular-nums"
        style={{ color: "var(--text-secondary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function EditableCategory({
  value,
  onSave,
  editedAt,
}: {
  value?: string;
  onSave: (value: string) => void;
  editedAt?: string | null;
}) {
  const { data: categories } = useStoreCategories();
  const match = categories?.find((c) => c.id === value);
  const currentLabel =
    (match?.display_labels?.en as string | undefined) ??
    match?.key ??
    (value ? "Unknown" : "—");

  return (
    <Field label="Category">
      <div className="flex items-center gap-1.5">
        <select
          value={value ?? ""}
          onChange={(e) => {
            if (e.target.value) onSave(e.target.value);
          }}
          className="rounded-md border px-2 py-0.5 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text)",
          }}
          title="Click to change category"
        >
          <option value="" disabled>
            {currentLabel}
          </option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {(cat.display_labels?.en as string) ?? cat.key}
            </option>
          ))}
        </select>
        {editedAt != null && (
          <span
            className="text-xs"
            style={{ color: "var(--secondary)" }}
            title={`Edited ${new Date(editedAt).toLocaleString()}`}
          >
            (edited)
          </span>
        )}
      </div>
    </Field>
  );
}

function EditableText({
  value,
  onSave,
  className = "",
  editedAt,
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  editedAt?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`${className} rounded border px-1 outline-none`}
        style={{
          borderColor: "var(--primary)",
          backgroundColor: "var(--bg-secondary)",
          color: "var(--text)",
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`${className} cursor-pointer rounded px-1 text-left transition-colors hover:bg-[var(--primary-light)]`}
      style={{ color: "var(--text)" }}
      title="Click to edit"
    >
      {value}
      {editedAt != null && (
        <span
          className="ml-1.5 text-xs font-normal"
          style={{ color: "var(--secondary)" }}
          title={`Edited ${new Date(editedAt).toLocaleString()}`}
        >
          (edited)
        </span>
      )}
    </button>
  );
}

function EditableDate({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    if (draft && draft !== value) {
      onSave(draft);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="rounded border px-1 text-sm outline-none"
        style={{
          borderColor: "var(--primary)",
          backgroundColor: "var(--bg-secondary)",
          color: "var(--text)",
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="cursor-pointer rounded px-1 text-left text-sm transition-colors hover:bg-[var(--primary-light)]"
      style={{ color: "var(--text-secondary)" }}
      title="Click to edit date"
    >
      {formatDate(value)}
    </button>
  );
}

function DetailSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading transaction"
    >
      <div className="flex items-center gap-4">
        <div
          className="h-4 w-12 animate-pulse rounded"
          style={{ backgroundColor: "var(--border)" }}
        />
        <div className="space-y-2">
          <div
            className="h-6 w-48 animate-pulse rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div
            className="h-4 w-32 animate-pulse rounded"
            style={{ backgroundColor: "var(--border)" }}
          />
        </div>
      </div>
      <div
        className="rounded-lg border p-5"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <div
                className="h-3 w-16 animate-pulse rounded"
                style={{ backgroundColor: "var(--border)" }}
              />
              <div
                className="h-5 w-28 animate-pulse rounded"
                style={{ backgroundColor: "var(--border)" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div
        className="rounded-lg border p-5"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b py-3 last:border-b-0"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="h-4 w-40 animate-pulse rounded"
              style={{ backgroundColor: "var(--border)" }}
            />
            <div
              className="ml-auto h-4 w-20 animate-pulse rounded"
              style={{ backgroundColor: "var(--border)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
