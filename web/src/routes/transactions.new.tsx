import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";

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
  price: string;
}

function NewTransactionPage() {
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txTime, setTxTime] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [manualTotal, setManualTotal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const itemsTotal = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  const total = items.length > 0 ? itemsTotal : Number(manualTotal) || 0;
  const canSave = merchant.trim().length > 0 && txDate.length > 0 && total > 0 && !saving;

  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const submit = async () => {
    setSaving(true);
    setError(null);
    const { data, error: apiError } = await apiClient.POST("/api/v1/transactions", {
      body: {
        merchant: merchant.trim(),
        transaction_date: txDate,
        transaction_time: txTime || null,
        country: country.trim() || null,
        city: city.trim() || null,
        total_minor: Math.round(total),
        currency: "CLP",
        receipt_type: "manual",
        recurrence_kind: "none",
        recurrence_source: "none",
        image_urls: [],
        items: items
          .filter((it) => it.name.trim())
          .map((it, index) => ({
            name: it.name.trim(),
            total_price_minor: Math.round(Number(it.price) || 0),
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
            type="date"
            data-testid="manual-date"
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
              data-testid={`manual-item-price-${i}`}
              type="number"
              min="0"
              value={it.price}
              onChange={(e) => updateItem(i, { price: e.target.value })}
              placeholder="CLP"
              className="w-28 rounded-md border px-2 py-1.5 text-sm"
              style={inputStyle}
            />
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
          onClick={() => setItems([...items, { name: "", price: "" }])}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--border)", color: "var(--primary)" }}
        >
          + Add item
        </button>
      </fieldset>

      <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
        Total (CLP) {items.length > 0 ? "— auto-summed from items" : "*"}
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
