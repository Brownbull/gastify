import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";
import { PersonalOnlyNotice } from "@/components/PersonalOnlyNotice";
import { useUiStore } from "@/stores/uiStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type RefCategory = { id: string; key: string; level: number; display_labels?: Record<string, string> };

/** Parse a typed date per the user's configured display format into ISO. */
function parseDisplayDate(value: string, format: string): string | null {
  const m = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const [a, b, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const [day, month] = format.startsWith("dd") ? [a, b] : [b, a];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day)
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const Route = createFileRoute("/transactions/new")({
  component: NewTransactionPage,
});

interface DraftItem {
  name: string;
  qty: string;
  price: string;
  cents: string;
  categoryId: string;
}

const EMPTY_ITEM: DraftItem = { name: "", qty: "1", price: "", cents: "0", categoryId: "" };

const inputClass =
  "rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-8 text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong";

function NewTransactionPage() {
  const navigate = useNavigate();
  const inGroupMode = useUiStore((s) => s.activeScope.kind === "group");
  const [merchant, setMerchant] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txTime, setTxTime] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [manualTotal, setManualTotal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateFormat, setDateFormat] = useState("dd/MM/yyyy");
  const [currency, setCurrency] = useState("CLP");
  const [storeCategories, setStoreCategories] = useState<RefCategory[]>([]);
  const [itemCategories, setItemCategories] = useState<RefCategory[]>([]);
  const [storeCategoryId, setStoreCategoryId] = useState("");
  const hasCents = currency === "USD";

  useEffect(() => {
    apiClient.GET("/api/v1/privacy/profile").then(({ data }) => {
      if (data) {
        setDateFormat(data.date_format ?? "dd/MM/yyyy");
        setCurrency(data.default_currency ?? "CLP");
      }
    });
    apiClient.GET("/api/v1/reference/store-categories").then(({ data }) => {
      if (data) setStoreCategories((data as RefCategory[]).filter((c) => c.level === 2));
    });
    apiClient.GET("/api/v1/reference/item-categories").then(({ data }) => {
      if (data) setItemCategories((data as RefCategory[]).filter((c) => c.level === 4));
    });
  }, []);

  const minorFactor = hasCents ? 100 : 1;
  const itemMinor = (it: DraftItem) =>
    (Number(it.price) || 0) * minorFactor + (hasCents ? Number(it.cents) || 0 : 0);
  const itemsTotal = items.reduce((sum, it) => sum + itemMinor(it), 0);
  const total = items.length > 0 ? itemsTotal : (Number(manualTotal) || 0) * minorFactor;
  const isoDate = useMemo(() => parseDisplayDate(txDate, dateFormat), [txDate, dateFormat]);
  const canSave = merchant.trim().length > 0 && isoDate !== null && total > 0 && !saving;

  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const submit = async () => {
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await apiClient.POST("/api/v1/transactions", {
      body: {
        merchant: merchant.trim(),
        transaction_date: isoDate!,
        transaction_time: txTime || null,
        country: country.trim() || null,
        city: city.trim() || null,
        total_minor: Math.round(total),
        currency,
        store_category_id: storeCategoryId || null,
        receipt_type: "manual",
        recurrence_kind: "none",
        recurrence_source: "none",
        image_urls: [],
        items: items
          .filter((it) => it.name.trim())
          .map((it, index) => ({
            name: it.name.trim(),
            qty: Number(it.qty) || 1,
            total_price_minor: Math.round(itemMinor(it)),
            item_category_id: it.categoryId || null,
            is_flagged: false,
            sort_order: index,
          })),
      },
    });
    setSaving(false);
    if (apiError || !data) {
      setError("Could not save the transaction");
      return;
    }
    void navigate({
      to: "/transactions/$transactionId",
      params: { transactionId: (data as { id: string }).id },
    });
  };

  if (inGroupMode) return <PersonalOnlyNotice />;

  return (
    <div className="mx-auto max-w-xl space-y-gt-16">
      <div>
        <h1 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">Add transaction</h1>
        <p className="mt-gt-2 text-gt-sm font-medium text-gt-ink-2">
          No receipt photo needed — enter the details manually. With a photo, use Scan instead.
        </p>
      </div>

      <Card>
        <div className="space-y-gt-12">
          <FormField label="Merchant *">
            <input data-testid="manual-merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} className={inputClass} />
          </FormField>
          <div className="flex gap-gt-10">
            <FormField label="Date *" className="flex-1">
              <input type="text" inputMode="numeric" data-testid="manual-date" placeholder={dateFormat} value={txDate} onChange={(e) => setTxDate(e.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Time" className="flex-1">
              <input type="time" data-testid="manual-time" value={txTime} onChange={(e) => setTxTime(e.target.value)} className={inputClass} />
            </FormField>
          </div>
          <div className="flex gap-gt-10">
            <FormField label="Country" className="flex-1">
              <input data-testid="manual-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="CL" className={inputClass} />
            </FormField>
            <FormField label="City" className="flex-1">
              <input data-testid="manual-city" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
            </FormField>
          </div>
          <FormField label="Category">
            <select data-testid="manual-store-category" value={storeCategoryId} onChange={(e) => setStoreCategoryId(e.target.value)} className={inputClass}>
              <option value="">(none)</option>
              {storeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_labels?.es ?? c.key}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </Card>

      <Card title="Items">
        <fieldset className="space-y-gt-8">
          <legend className="sr-only">Items (one by one)</legend>
          {items.map((it, i) => (
            <div key={i} className="flex flex-wrap items-center gap-gt-6 rounded-gt-lg border-2 border-gt-line bg-gt-surface p-gt-8">
              <input data-testid={`manual-item-name-${i}`} value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} placeholder="Item" className={`${inputClass} flex-1`} />
              <input data-testid={`manual-item-qty-${i}`} type="number" min="0" step="1" value={it.qty} onChange={(e) => updateItem(i, { qty: e.target.value })} placeholder="Qty" className={`${inputClass} w-16`} />
              <input data-testid={`manual-item-price-${i}`} type="number" min="0" step="1" value={it.price} onChange={(e) => updateItem(i, { price: e.target.value })} placeholder={currency} className={`${inputClass} w-24`} />
              {hasCents && (
                <input data-testid={`manual-item-cents-${i}`} type="number" min="0" max="99" step="1" value={it.cents} onChange={(e) => updateItem(i, { cents: e.target.value })} placeholder="¢" className={`${inputClass} w-16`} />
              )}
              <select data-testid={`manual-item-category-${i}`} value={it.categoryId} onChange={(e) => updateItem(i, { categoryId: e.target.value })} className={`${inputClass} w-32`}>
                <option value="">(category)</option>
                {itemCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_labels?.es ?? c.key}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => setItems(items.filter((_, j) => j !== i))}
                className="grid h-7 w-7 place-items-center rounded-gt-md text-gt-negative transition hover:bg-gt-negative/10"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            data-testid="manual-add-item"
            onClick={() => setItems([...items, { ...EMPTY_ITEM }])}
            className="flex w-full items-center justify-center gap-gt-6 rounded-gt-xl border-2 border-dashed border-gt-line-strong bg-gt-surface px-gt-12 py-gt-10 font-gt-display text-gt-sm font-extrabold text-gt-primary transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:bg-gt-primary-soft"
          >
            <span className="text-gt-lg leading-none">+</span> Add item
          </button>
        </fieldset>
      </Card>

      <Card>
        <FormField label={`Total (${currency}${hasCents ? ", cents-composed minor units" : ""}) ${items.length > 0 ? "— auto-summed from items" : "*"}`}>
          <input
            type="number"
            min="0"
            data-testid="manual-total"
            value={items.length > 0 ? String(itemsTotal) : manualTotal}
            readOnly={items.length > 0}
            onChange={(e) => setManualTotal(e.target.value)}
            className={`${inputClass} ${items.length > 0 ? "opacity-70" : ""}`}
          />
        </FormField>
        {error && (
          <p className="mt-gt-8 text-gt-sm font-bold text-gt-negative" role="alert">
            {error}
          </p>
        )}
        <div className="mt-gt-12">
          <Button variant="success" fullWidth data-testid="manual-save" disabled={!canSave} onClick={submit}>
            Save transaction
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FormField({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-gt-4 ${className}`}>
      <span className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">{label}</span>
      {children}
    </label>
  );
}
