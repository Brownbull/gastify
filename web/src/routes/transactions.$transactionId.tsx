import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useTransaction,
  useUpdateTransaction,
  useUpdateItemFlags,
  type ItemFlagKind,
} from "@/hooks/useTransactions";
import { useStoreCategories } from "@/hooks/useCategories";
import { useProfile } from "@/hooks/useProfile";
import { useUiStore } from "@/stores/uiStore";
import { transactionLocationLabel } from "@/lib/locationDisplay";
import { formatMinorAmount, formatDate } from "@/lib/format";
import { ShareToGroupButton } from "@/components/ShareToGroupButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { components } from "@/lib/api-types";

type TransactionDetail = components["schemas"]["TransactionDetail"];
type TransactionItemResponse = components["schemas"]["TransactionItemResponse"];

const FLAG_OPTIONS: { kind: ItemFlagKind; label: string }[] = [
  { kind: "urgency", label: "Urgency" },
  { kind: "special_case", label: "Special-case" },
];

type ToggleFlag = (item: TransactionItemResponse, kind: ItemFlagKind) => void;

const inputClass =
  "rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-6 text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong";

export const Route = createFileRoute("/transactions/$transactionId")({
  component: TransactionDetailPage,
});

function TransactionDetailPage() {
  const { transactionId } = Route.useParams();
  const { data: txn, isLoading, error } = useTransaction(transactionId);
  const mutation = useUpdateTransaction(transactionId);
  const flagMutation = useUpdateItemFlags(transactionId);

  const toggleFlag: ToggleFlag = (item, kind) => {
    const current = item.flags ?? [];
    const next = current.includes(kind)
      ? current.filter((flag) => flag !== kind)
      : [...current, kind];
    flagMutation.mutate({ itemId: item.id, flags: next });
  };

  if (isLoading) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="space-y-gt-12">
        <BackLink />
        <div
          className="rounded-gt-xl border-2 border-gt-error bg-gt-error/5 px-gt-16 py-gt-12 text-center"
          role="alert"
        >
          <p className="text-gt-sm font-bold text-gt-error">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!txn) return null;

  // D74: once shared into a group, the receipt's CONTENT is locked (the group keeps
  // a snapshot). Item flags, card pairing and recurrence stay editable elsewhere.
  const locked = txn.is_shared;

  return (
    <div className="space-y-gt-16">
      <div className="flex items-start gap-gt-12">
        <BackLink />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-gt-8">
            <EditableText
              value={txn.merchant}
              onSave={(v) => mutation.mutate({ merchant: v })}
              className="font-gt-display text-gt-2xl font-extrabold text-gt-ink"
              editedAt={txn.merchant_user_edited_at}
              locked={locked}
            />
            {locked && <SharedLockBadge />}
            {txn.statement_matched && <StatementMatchedBadge />}
          </div>
          <EditableDate
            value={txn.transaction_date}
            onSave={(v) => mutation.mutate({ transaction_date: v })}
            locked={locked}
          />
        </div>
      </div>

      <ShareToGroupButton transactionId={transactionId} />

      {locked && (
        <div
          data-testid="shared-lock-banner"
          className="flex items-start gap-gt-8 rounded-gt-xl border-2 border-gt-primary bg-gt-primary-soft px-gt-16 py-gt-12 text-gt-sm font-bold text-gt-primary"
        >
          <span aria-hidden>🔒</span>
          <span>
            This transaction is shared to a group, so its contents are locked. You can
            still flag items, pair a card, or mark it recurrent.
          </span>
        </div>
      )}

      {mutation.error && (
        <DismissibleError message={mutation.error.message} onDismiss={() => mutation.reset()} />
      )}

      <SummaryCard
        txn={txn}
        locked={locked}
        onCategoryChange={(id) => mutation.mutate({ store_category_id: id })}
      />

      {flagMutation.error && (
        <DismissibleError message={flagMutation.error.message} onDismiss={() => flagMutation.reset()} />
      )}

      {txn.items.length > 0 && (
        <ItemsTable
          txn={txn}
          onToggleFlag={toggleFlag}
          flagPending={flagMutation.isPending}
        />
      )}

      {txn.images.length > 0 && <ImagesSection images={txn.images} />}

      <MetadataSection txn={txn} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/transactions"
      aria-label="Back to transactions"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-lg font-extrabold text-gt-ink shadow-gt-xs transition hover:bg-gt-bg-3"
    >
      <span aria-hidden="true">&larr;</span>
    </Link>
  );
}

function DismissibleError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="flex items-center justify-between gap-gt-8 rounded-gt-xl border-2 border-gt-error bg-gt-error/5 px-gt-16 py-gt-12"
      role="alert"
    >
      <p className="text-gt-sm font-bold text-gt-error">{message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-gt-xs font-extrabold uppercase tracking-wide text-gt-error underline"
      >
        Dismiss
      </button>
    </div>
  );
}

function StatementMatchedBadge() {
  return (
    <span data-testid="txn-matched-badge" title="Matched against a card statement">
      <Badge tone="positive">✓ Matched</Badge>
    </span>
  );
}

function SharedLockBadge() {
  return (
    <span data-testid="shared-lock-badge" title="Shared to a group — contents locked">
      <Badge tone="primary">🔒 Shared</Badge>
    </span>
  );
}

function SummaryCard({
  txn,
  locked,
  onCategoryChange,
}: {
  txn: TransactionDetail;
  locked: boolean;
  onCategoryChange: (id: string) => void;
}) {
  const isEdited =
    txn.merchant_user_edited_at != null ||
    txn.store_category_user_edited_at != null;
  const profile = useProfile();
  const foreignLocationFormat = useUiStore((s) => s.foreignLocationFormat);
  const locationLabel = transactionLocationLabel(
    txn.country,
    txn.city,
    profile.data?.default_country,
    foreignLocationFormat,
  );

  return (
    <Card>
      <div className="grid gap-gt-16 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Total">
          <span className="font-gt-display text-gt-xl font-extrabold tabular-nums text-gt-ink">
            {formatMinorAmount(txn.total_minor, txn.currency)}
          </span>
        </Field>

        <Field label="USD equivalent">
          <span className="font-bold tabular-nums text-gt-ink">
            {txn.amount_usd_minor != null
              ? formatMinorAmount(txn.amount_usd_minor, "USD")
              : "—"}
          </span>
          {txn.fx_rate_to_usd && (
            <span className="text-gt-xs font-medium text-gt-ink-3"> @ {txn.fx_rate_to_usd}</span>
          )}
        </Field>

        <Field label="Merchant">
          <span className="font-bold text-gt-ink">{txn.merchant}</span>
          {isEdited && (
            <span className="ml-gt-2 text-gt-xs font-bold text-gt-secondary" title="User edited">
              (edited)
            </span>
          )}
          {txn.alias && (
            <span className="ml-gt-2 text-gt-xs font-medium text-gt-ink-3">{txn.alias}</span>
          )}
        </Field>

        <EditableCategory
          value={txn.store_category_id ?? undefined}
          onSave={onCategoryChange}
          editedAt={txn.store_category_user_edited_at}
          locked={locked}
        />

        <Field label="Receipt type">
          {txn.receipt_type ? (
            <Badge tone="primary">{txn.receipt_type}</Badge>
          ) : (
            <span className="font-bold text-gt-ink-3">—</span>
          )}
        </Field>

        {locationLabel && (
          <Field label="Location">
            <span className="font-bold text-gt-ink">{locationLabel}</span>
          </Field>
        )}
      </div>
    </Card>
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
    <div className="flex flex-col gap-gt-2">
      <span className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
        {label}
      </span>
      <div className="text-gt-sm">{children}</div>
    </div>
  );
}

function ItemsTable({
  txn,
  onToggleFlag,
  flagPending,
}: {
  txn: TransactionDetail;
  onToggleFlag: ToggleFlag;
  flagPending: boolean;
}) {
  return (
    <Card padded={false}>
      <div className="px-gt-16 pt-gt-12 pb-gt-8">
        <h2 className="font-gt-display text-gt-md font-extrabold text-gt-ink">
          Line items ({txn.items.length})
        </h2>
        <p className="text-gt-xs font-medium text-gt-ink-3">
          Flag an item to keep it out of your monthly insights — it stays here.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-gt-sm">
          <thead>
            <tr className="border-b-2 border-gt-line text-left">
              <th scope="col" className="px-gt-16 py-gt-8 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
                Item
              </th>
              <th scope="col" className="hidden px-gt-16 py-gt-8 text-center text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3 sm:table-cell">
                Qty
              </th>
              <th scope="col" className="hidden px-gt-16 py-gt-8 text-right text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3 sm:table-cell">
                Unit price
              </th>
              <th scope="col" className="px-gt-16 py-gt-8 text-right text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
                Total
              </th>
              <th scope="col" className="hidden px-gt-16 py-gt-8 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3 md:table-cell">
                Category
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-gt-line">
            {txn.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                currency={txn.currency}
                onToggleFlag={onToggleFlag}
                flagPending={flagPending}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gt-line">
              <td className="px-gt-16 py-gt-12 font-gt-display font-extrabold text-gt-ink" colSpan={3}>
                Total
              </td>
              <td className="px-gt-16 py-gt-12 text-right font-gt-display font-extrabold tabular-nums text-gt-ink">
                {formatMinorAmount(txn.total_minor, txn.currency)}
              </td>
              <td className="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function ItemFlagControls({
  item,
  onToggleFlag,
  flagPending,
}: {
  item: TransactionItemResponse;
  onToggleFlag: ToggleFlag;
  flagPending: boolean;
}) {
  const flags = item.flags ?? [];

  return (
    <div className="mt-gt-4 flex flex-wrap gap-gt-4">
      {FLAG_OPTIONS.map((option) => {
        const active = flags.includes(option.kind);
        return (
          <button
            key={option.kind}
            type="button"
            aria-pressed={active}
            disabled={flagPending}
            onClick={() => onToggleFlag(item, option.kind)}
            className={`rounded-gt-pill border-2 px-gt-8 py-gt-2 text-gt-xs font-extrabold transition disabled:opacity-50 ${
              active
                ? "border-gt-line-strong bg-gt-primary text-white"
                : "border-gt-line bg-gt-surface text-gt-ink-3 hover:border-gt-line-strong"
            }`}
            title={
              active
                ? `Remove ${option.label.toLowerCase()} flag`
                : `Flag as ${option.label.toLowerCase()} (excluded from your insights)`
            }
          >
            {active ? "✓ " : ""}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ItemRow({
  item,
  currency,
  onToggleFlag,
  flagPending,
}: {
  item: TransactionItemResponse;
  currency: string;
  onToggleFlag: ToggleFlag;
  flagPending: boolean;
}) {
  const isEdited =
    item.name_user_edited_at != null ||
    item.item_category_user_edited_at != null;

  return (
    <tr>
      <td className="px-gt-16 py-gt-10">
        <div className="font-bold text-gt-ink">
          {item.name}
          {isEdited && (
            <span className="ml-gt-2 text-gt-xs font-bold text-gt-secondary" title="User edited">
              (edited)
            </span>
          )}
        </div>
        <ItemFlagControls
          item={item}
          onToggleFlag={onToggleFlag}
          flagPending={flagPending}
        />
      </td>
      <td className="hidden px-gt-16 py-gt-10 text-center font-bold tabular-nums text-gt-ink-3 sm:table-cell">
        {item.qty ?? "—"}
      </td>
      <td className="hidden px-gt-16 py-gt-10 text-right font-bold tabular-nums text-gt-ink-3 sm:table-cell">
        {item.unit_price_minor != null
          ? formatMinorAmount(item.unit_price_minor, currency)
          : "—"}
      </td>
      <td className="px-gt-16 py-gt-10 text-right font-bold tabular-nums text-gt-ink">
        {formatMinorAmount(item.total_price_minor, currency)}
      </td>
      <td className="hidden px-gt-16 py-gt-10 font-medium text-gt-ink-3 md:table-cell">
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
    <Card title={`Receipt images (${images.length})`}>
      <div className="flex flex-wrap gap-gt-10">
        {images.map((img) => (
          <a
            key={img.id}
            href={img.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-gt-lg border-2 border-gt-line-strong shadow-gt-xs transition hover:opacity-80"
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
    </Card>
  );
}

function MetadataSection({ txn }: { txn: TransactionDetail }) {
  const hasProcessingMeta =
    txn.scan_duration_ms != null ||
    txn.llm_latency_ms != null ||
    txn.llm_tokens_in != null;

  if (!hasProcessingMeta) return null;

  return (
    <details className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
      <summary className="cursor-pointer px-gt-16 py-gt-12 font-gt-display text-gt-sm font-extrabold text-gt-ink-2">
        Processing metadata
      </summary>
      <div className="grid gap-gt-12 border-t-2 border-gt-line px-gt-16 py-gt-12 sm:grid-cols-2 lg:grid-cols-4">
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
    <div className="flex flex-col gap-gt-2">
      <span className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
        {label}
      </span>
      <span className="text-gt-sm font-bold tabular-nums text-gt-ink-2">{value}</span>
    </div>
  );
}

function EditableCategory({
  value,
  onSave,
  editedAt,
  locked = false,
}: {
  value?: string;
  onSave: (value: string) => void;
  editedAt?: string | null;
  locked?: boolean;
}) {
  const { data: categories } = useStoreCategories();
  const match = categories?.find((c) => c.id === value);
  const currentLabel =
    (match?.display_labels?.en as string | undefined) ??
    match?.key ??
    (value ? "Unknown" : "—");

  if (locked) {
    return (
      <Field label="Category">
        <span className="font-bold text-gt-ink">{currentLabel}</span>
      </Field>
    );
  }

  return (
    <Field label="Category">
      <div className="flex items-center gap-gt-4">
        <select
          value={value ?? ""}
          onChange={(e) => {
            if (e.target.value) onSave(e.target.value);
          }}
          className={inputClass}
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
            className="text-gt-xs font-bold text-gt-secondary"
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
  locked = false,
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  editedAt?: string | null;
  locked?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setDraft(value);
  }

  // Hooks BEFORE the early return — a conditional hook corrupts React's hook order
  // when `locked` flips (rules-of-hooks). Focusing is a no-op while locked.
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (locked) {
    return <span className={`${className} px-gt-2`}>{value}</span>;
  }

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
        className={`${className} rounded-gt-md border-2 border-gt-primary bg-gt-surface px-gt-4 outline-none`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`${className} cursor-pointer rounded-gt-md border-2 border-transparent px-gt-2 text-left transition hover:border-gt-line hover:bg-gt-primary-soft`}
      title="Click to edit"
    >
      {value}
      {editedAt != null && (
        <span
          className="ml-gt-2 text-gt-xs font-bold text-gt-secondary"
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
  locked = false,
}: {
  value: string;
  onSave: (value: string) => void;
  locked?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setDraft(value);
  }

  // Hooks BEFORE the early return (rules-of-hooks; see the text editor above).
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (locked) {
    return (
      <span className="px-gt-2 text-gt-sm font-bold text-gt-ink-2">{formatDate(value)}</span>
    );
  }

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
        className="rounded-gt-md border-2 border-gt-primary bg-gt-surface px-gt-4 text-gt-sm font-bold outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="mt-gt-2 cursor-pointer rounded-gt-md border-2 border-transparent px-gt-2 text-left text-gt-sm font-bold text-gt-ink-2 transition hover:border-gt-line hover:bg-gt-primary-soft"
      title="Click to edit date"
    >
      {formatDate(value)}
    </button>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-gt-16" aria-busy="true" aria-label="Loading transaction">
      <div className="flex items-center gap-gt-12">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-gt-lg bg-gt-bg-3" />
        <div className="space-y-gt-6">
          <div className="h-6 w-48 animate-pulse rounded-gt-md bg-gt-bg-3" />
          <div className="h-4 w-32 animate-pulse rounded-gt-md bg-gt-bg-3" />
        </div>
      </div>
      <Card>
        <div className="grid gap-gt-16 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-gt-6">
              <div className="h-3 w-16 animate-pulse rounded-gt-md bg-gt-bg-3" />
              <div className="h-5 w-28 animate-pulse rounded-gt-md bg-gt-bg-3" />
            </div>
          ))}
        </div>
      </Card>
      <Card padded={false}>
        <div className="divide-y-2 divide-gt-line">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-gt-16 px-gt-16 py-gt-12">
              <div className="h-4 w-40 animate-pulse rounded-gt-md bg-gt-bg-3" />
              <div className="ml-auto h-4 w-20 animate-pulse rounded-gt-md bg-gt-bg-3" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
