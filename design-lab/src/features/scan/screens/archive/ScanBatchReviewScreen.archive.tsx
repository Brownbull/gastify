/* ARCHIVED 2026-06-24: batch-scan deferred (per user — not in MVP scope for now). */
import { useEffect, useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import type { Platform } from "@design-system/organisms/AppSurface";
import { getCategoryToken } from "@lib/categoryTokens";
import { clp } from "@lib/transactionFixtures";
import { SAMPLE_BATCH, batchCounts, type BatchReceipt } from "./batchFixtures";

/** extracted outcomes a still-processing receipt resolves into (mockup). */
const OUTCOMES: Array<{ merchant: string; total: number; category: string }> = [
  { merchant: "Café Wenu", total: 6700, category: "restaurantes" },
  { merchant: "Jumbo", total: 31480, category: "supermercados" },
  { merchant: "Sodimac", total: 18990, category: "vivienda" },
];

/** count chip — icon + "N label", colored by tone. */
function CountChip({ icon, n, label, tone }: { icon: string; n: number; label: string; tone: "ok" | "wait" | "bad" }) {
  const cls =
    tone === "ok" ? "border-gt-positive bg-gt-positive-bg text-gt-positive"
    : tone === "bad" ? "border-gt-negative bg-gt-negative-bg text-gt-negative"
    : "border-gt-line-strong bg-gt-bg-3 text-gt-ink-2";
  return (
    <span className={`inline-flex items-center gap-gt-4 rounded-gt-pill border-2 px-gt-10 py-gt-2 font-gt-display text-gt-xs font-extrabold ${cls}`}>
      <PixelIcon name={icon} size={16} /> {n} {label}
    </span>
  );
}

function ReceiptRow({ r, onRetry, onDiscard }: { r: BatchReceipt; onRetry: () => void; onDiscard: () => void }) {
  const tint = r.status === "done" && r.category ? getCategoryToken(r.category).tint : "var(--color-gt-bg-3)";
  return (
    <li className="flex items-center gap-gt-10 px-gt-12 py-gt-10">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong" style={{ backgroundColor: tint }}>
        <PixelIcon name="scan-receipt" size={26} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        {r.status === "done" ? (
          <>
            <span className="min-w-0 truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{r.merchant}</span>
            <span className="flex items-center gap-gt-4 text-gt-sm font-bold text-gt-ink-2">
              <PixelIcon name="scan-success" size={15} /> Listo · {clp(r.total ?? 0)}
            </span>
          </>
        ) : r.status === "processing" ? (
          <>
            <span className="min-w-0 truncate font-gt-display text-gt-md font-extrabold text-gt-ink-2">Procesando…</span>
            <span className="flex items-center gap-gt-4 text-gt-sm font-medium text-gt-ink-3">
              <PixelIcon name="status-sync" size={15} /> Extrayendo datos
            </span>
          </>
        ) : (
          <>
            <span className="min-w-0 truncate font-gt-display text-gt-md font-extrabold text-gt-negative">No se pudo leer</span>
            <span className="truncate text-gt-sm font-medium text-gt-ink-3">{r.error}</span>
          </>
        )}
      </span>

      <span className="flex shrink-0 items-center gap-gt-4">
        {r.status === "failed" ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-gt-2 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-8 py-gt-2 font-gt-display text-gt-xs font-extrabold text-gt-ink transition hover:-translate-y-0.5 hover:bg-gt-bg-3"
          >
            <PixelIcon name="status-sync" size={16} /> Reintentar
          </button>
        ) : null}
        {r.status === "processing" ? null : (
          <button
            type="button"
            aria-label="Descartar"
            onClick={onDiscard}
            className="grid h-9 w-9 place-items-center rounded-gt-md text-gt-ink-3 transition hover:-translate-y-0.5 hover:bg-gt-negative-bg hover:text-gt-negative"
          >
            <PixelIcon name="action-delete" size={24} />
          </button>
        )}
      </span>
    </li>
  );
}

export interface ScanBatchReviewScreenProps {
  items?: BatchReceipt[];
  onBack?: () => void;
  /** save the done receipts as transactions. */
  onSave?: (count: number) => void;
  /** return to capture to add more. */
  onScanMore?: () => void;
  platform?: Platform;
}

/**
 * ScanBatchReviewScreen — batch-scan screen 2: the per-receipt queue. Each
 * captured image processes independently and lands done (merchant + total),
 * failed (Reintentar / descartar), or stays processing. A summary band counts
 * the three; the footer saves the done receipts once nothing is still
 * processing, or returns to capture for more.
 */
export function ScanBatchReviewScreen({ items: initial = SAMPLE_BATCH, onBack, onSave, onScanMore, platform = "mobile" }: ScanBatchReviewScreenProps) {
  const [items, setItems] = useState(initial);
  const counts = batchCounts(items);

  // any receipt that mounts still "processing" finishes extracting after a beat.
  useEffect(() => {
    const ts = items
      .filter((it) => it.status === "processing")
      .map((it, k) => setTimeout(() => {
        const o = OUTCOMES[k % OUTCOMES.length];
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "done", merchant: o.merchant, total: o.total, category: o.category } : p)));
      }, 1300 + k * 800));
    return () => ts.forEach(clearTimeout);
    // mount-only: resolve the initial processing rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = (id: number) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "processing", error: undefined } : it)));
    // mockup: a retried receipt recovers after a beat.
    setTimeout(() => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "done", merchant: "Boleta recuperada", total: 12500, category: "comercio-barrio" } : it)));
    }, 1400);
  };
  const discard = (id: number) => setItems((prev) => prev.filter((it) => it.id !== id));

  const canSave = counts.processing === 0 && counts.done > 0;
  const contentMax = platform === "desktop" ? "44rem" : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Revisar lote" onBack={onBack} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-12 pt-gt-12" style={{ maxWidth: contentMax }}>
          {/* summary band */}
          <div className="flex flex-wrap items-center gap-gt-6">
            <CountChip icon="scan-success" n={counts.done} label="listas" tone="ok" />
            {counts.processing > 0 ? <CountChip icon="status-sync" n={counts.processing} label="procesando" tone="wait" /> : null}
            {counts.failed > 0 ? <CountChip icon="status-alert" n={counts.failed} label="con error" tone="bad" /> : null}
          </div>

          {items.length === 0 ? (
            <p className="rounded-gt-2xl border-2 border-gt-line bg-gt-surface px-gt-12 py-gt-16 text-center text-gt-sm font-medium text-gt-ink-3">
              No quedan boletas en el lote.
            </p>
          ) : (
            <div className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
              <ul className="divide-y-2 divide-gt-line">
                {items.map((r) => (
                  <ReceiptRow key={r.id} r={r} onRetry={() => retry(r.id)} onDiscard={() => discard(r.id)} />
                ))}
              </ul>
            </div>
          )}

          {counts.failed > 0 ? (
            <p className="px-gt-4 text-center text-gt-xs font-medium text-gt-ink-3">
              Reintenta o descarta las boletas con error para guardar el lote.
            </p>
          ) : null}
        </div>
      </div>

      {/* footer — Escanear más · Guardar */}
      <div className="shrink-0 border-t-2 border-gt-line bg-gt-surface px-gt-16 py-gt-12">
        <div className="mx-auto grid w-full grid-cols-[auto_minmax(0,1fr)] gap-gt-10" style={{ maxWidth: contentMax }}>
          <Button variant="ghost" onClick={onScanMore}>
            <span className="flex items-center gap-gt-4"><PixelIcon name="scan-batch" size={22} /> Más</span>
          </Button>
          <Button variant="primary" disabled={!canSave} onClick={() => onSave?.(counts.done)} className="justify-center bg-gt-positive-bg! text-gt-ink!">
            Guardar {counts.done} boleta{counts.done === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </div>
  );
}
