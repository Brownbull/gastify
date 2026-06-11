import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";
import { PersonalOnlyNotice } from "@/components/PersonalOnlyNotice";
import { useUiStore } from "@/stores/uiStore";

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

/**
 * Manual transaction entry (statement-hardening plan, Phase 3) over the
 * long-existing POST /transactions: merchant, date, time, place (country/city) and
 * items one-by-one; the total auto-sums from items (or can be typed when no items).
 * receipt_type="manual" — the ledger's source filter isolates these. Minimal
 * functional markup with stable testids; the visual overhaul re-skins.
 */

interface DraftItem {
  name: string;
  qty: string;
  price: string;
  cents: string;
  categoryId: string;
}

const EMPTY_ITEM: DraftItem = { name: "", qty: "1", price: "", cents: "0", categoryId: "" };

function NewTransactionPage() {
  const navigate = useNavigate();
  // D70: capture is personal-only. POST /transactions always writes the personal
  // scope, so creating "inside" a group view would silently land elsewhere.
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
  // User prefs + reference taxonomies (date format drives the placeholder; currency
  // exponent decides single-integer vs whole+cents price entry).
  const [dateFormat, setDateFormat] = useState("dd/MM/yyyy");
  const [currency, setCurrency] = useState("CLP");
  const [storeCategories, setStoreCategories] = useState<RefCategory[]>([]);
  const [itemCategories, setItemCategories] = useState<RefCategory[]>([]);
  const [storeCategoryId, setStoreCategoryId] = useState("");
  const hasCents = currency === "USD"; // exponent>0 currencies get the cents field

  useEffect(() => {
    apiClient.GET("/api/v1/privacy/profile").then(({ data }) => {
      if (data) {
        // Tolerate older backends that predate these profile fields.
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

  const inputStyle = { borderColor: "var(--border)", color: "var(--text)" };

  if (inGroupMode) return <PersonalOnlyNotice />;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
        Add transaction
      </h1>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        No receipt photo needed — enter the details manually. With a photo, use Scan
        instead.
      </p>

      <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
        Merchant *
        <input
          data-testid="manual-merchant"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          className="rounded-md border px-2 py-1.5 text-sm"
          style={inputStyle}
        />
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Date *
          <input
            type="text"
            inputMode="numeric"
            data-testid="manual-date"
            placeholder={dateFormat}
            value={txDate}
            onChange={(e) => setTxDate(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Time
          <input
            type="time"
            data-testid="manual-time"
            value={txTime}
            onChange={(e) => setTxTime(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
            style={inputStyle}
          />
        </label>
      </div>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Country
          <input
            data-testid="manual-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="CL"
            className="rounded-md border px-2 py-1.5 text-sm"
            style={inputStyle}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          City
          <input
            data-testid="manual-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-sm"
            style={inputStyle}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
        Category
        <select
          data-testid="manual-store-category"
          value={storeCategoryId}
          onChange={(e) => setStoreCategoryId(e.target.value)}
          className="rounded-md border px-2 py-1.5 text-sm"
          style={inputStyle}
        >
          <option value="">(none)</option>
          {storeCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_labels?.es ?? c.key}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="space-y-2">
        <legend className="text-xs" style={{ color: "var(--text-muted)" }}>
          Items (one by one)
        </legend>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              data-testid={`manual-item-name-${i}`}
              value={it.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              placeholder="Item"
              className="flex-1 rounded-md border px-2 py-1.5 text-sm"
              style={inputStyle}
            />
            <input
              data-testid={`manual-item-qty-${i}`}
              type="number"
              min="0"
              step="1"
              value={it.qty}
              onChange={(e) => updateItem(i, { qty: e.target.value })}
              placeholder="Qty"
              className="w-16 rounded-md border px-2 py-1.5 text-sm"
              style={inputStyle}
            />
            <input
              data-testid={`manual-item-price-${i}`}
              type="number"
              min="0"
              step="1"
              value={it.price}
              onChange={(e) => updateItem(i, { price: e.target.value })}
              placeholder={currency}
              className="w-24 rounded-md border px-2 py-1.5 text-sm"
              style={inputStyle}
            />
            {hasCents && (
              <input
                data-testid={`manual-item-cents-${i}`}
                type="number"
                min="0"
                max="99"
                step="1"
                value={it.cents}
                onChange={(e) => updateItem(i, { cents: e.target.value })}
                placeholder="¢"
                className="w-16 rounded-md border px-2 py-1.5 text-sm"
                style={inputStyle}
              />
            )}
            <select
              data-testid={`manual-item-category-${i}`}
              value={it.categoryId}
              onChange={(e) => updateItem(i, { categoryId: e.target.value })}
              className="w-32 rounded-md border px-2 py-1.5 text-sm"
              style={inputStyle}
            >
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
              className="text-xs"
              style={{ color: "var(--danger, #dc2626)" }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          data-testid="manual-add-item"
          onClick={() => setItems([...items, { ...EMPTY_ITEM }])}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--border)", color: "var(--primary)" }}
        >
          + Add item
        </button>
      </fieldset>

      <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
        Total ({currency}{hasCents ? ", in cents-composed minor units" : ""}) {items.length > 0 ? "— auto-summed from items" : "*"}
        <input
          type="number"
          min="0"
          data-testid="manual-total"
          value={items.length > 0 ? String(itemsTotal) : manualTotal}
          readOnly={items.length > 0}
          onChange={(e) => setManualTotal(e.target.value)}
          className="rounded-md border px-2 py-1.5 text-sm"
          style={inputStyle}
        />
      </label>

      {error && (
        <p className="text-sm" role="alert" style={{ color: "var(--danger, #dc2626)" }}>
          {error}
        </p>
      )}
      <button
        type="button"
        data-testid="manual-save"
        disabled={!canSave}
        onClick={submit}
        className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40"
        style={{ backgroundColor: "var(--primary)", color: "white" }}
      >
        Save transaction
      </button>
    </div>
  );
}
