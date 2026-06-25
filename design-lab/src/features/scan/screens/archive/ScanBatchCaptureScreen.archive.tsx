/* ARCHIVED 2026-06-24: batch-scan deferred (per user — not in MVP scope for now). */
import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ChevronLeftIcon } from "@design-system/assets/icons";
import { SCAN_CREDITS } from "@lib/scanFixtures";

/**
 * ScanBatchCaptureScreen (DM-42) — batch-scan screen 1: gather multiple receipt
 * images before scanning (legacy BoletApp BatchCaptureView). A full-bleed flex
 * column in the AppSurface frame:
 *   header  — back + "Lote de escaneo" + credit badges (normal · súper)
 *   grid    — 4-col thumbnails (each with a delete-X), a trailing dashed "add" tile
 *   counter — "N de 50 imágenes" + a fill bar
 *   cost    — "N boletas × 1 súper = N súper" + remaining credits
 *   footer  — Cancelar · Procesar lote (amber, disabled when empty)
 * Captured images are placeholders here (the real capture carries photo data);
 * each costs 1 súper credit per the batch model.
 */
export interface ScanBatchCaptureScreenProps {
  /** initial captured-image count (demo). */
  initialCount?: number;
  onBack?: () => void;
  onProcess?: (count: number) => void;
}

const MAX_IMAGES = 50;
const COST_PER_IMAGE = 1; // 1 súper credit per receipt in a batch

export function ScanBatchCaptureScreen({ initialCount = 3, onBack, onProcess }: ScanBatchCaptureScreenProps) {
  // each captured image is just an id for the mockup; add/remove manage the list.
  const [images, setImages] = useState<number[]>(() => Array.from({ length: initialCount }, (_, i) => i + 1));
  const [nextId, setNextId] = useState(initialCount + 1);

  const count = images.length;
  const cost = count * COST_PER_IMAGE;
  const remaining = SCAN_CREDITS.super - cost;
  const canProcess = count > 0 && remaining >= 0;

  function addImage() {
    if (count >= MAX_IMAGES) return;
    setImages((xs) => [...xs, nextId]);
    setNextId((n) => n + 1);
  }
  function removeImage(id: number) {
    setImages((xs) => xs.filter((x) => x !== id));
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      {/* header — back + title + credit badges */}
      <header className="flex items-center gap-gt-8 border-b-2 border-gt-line bg-gt-surface px-gt-16 pb-gt-10 pt-gt-16">
        <button type="button" aria-label="Volver" onClick={onBack} className="-ml-gt-4 grid h-8 w-8 shrink-0 place-items-center text-gt-ink transition hover:-translate-x-0.5">
          <ChevronLeftIcon className="h-7 w-7" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-gt-display text-gt-2xl font-extrabold text-gt-ink">Lote de escaneo</h1>
        <span className="flex shrink-0 items-center gap-gt-4">
          <span className="inline-flex items-center gap-gt-2 rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg-3 px-gt-6 py-gt-0 font-gt-display text-gt-xs font-extrabold text-gt-ink">
            <PixelIcon name="fin-coin" size={14} />{SCAN_CREDITS.normal}
          </span>
          <span className="inline-flex items-center gap-gt-2 rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary-soft px-gt-6 py-gt-0 font-gt-display text-gt-xs font-extrabold text-gt-primary">
            <PixelIcon name="scan-batch" size={14} />{SCAN_CREDITS.super}
          </span>
        </span>
      </header>

      {/* scrollable body — grid + counter + cost */}
      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16 pt-gt-12">
        {/* thumbnail grid (4 cols, 4:5 tiles) */}
        <div className="grid grid-cols-4 gap-gt-8">
          {images.map((id) => (
            <div key={id} className="relative aspect-[4/5] overflow-hidden rounded-gt-lg border-2 border-gt-line-strong bg-gt-ink shadow-gt-xs">
              {/* faux receipt thumbnail */}
              <div className="grid h-full w-full place-items-center">
                <PixelIcon name="scan-receipt" size={28} />
              </div>
              <button
                type="button"
                aria-label={`Eliminar imagen ${id}`}
                onClick={() => removeImage(id)}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-gt-pill border-2 border-gt-surface bg-gt-negative text-[10px] font-extrabold leading-none text-white shadow-gt-xs"
              >
                ✕
              </button>
            </div>
          ))}
          {/* add tile (dashed) */}
          {count < MAX_IMAGES ? (
            <button
              type="button"
              aria-label="Agregar imagen"
              onClick={addImage}
              className="grid aspect-[4/5] place-items-center rounded-gt-lg border-2 bg-gt-surface text-gt-ink-3 transition hover:-translate-y-0.5 hover:border-gt-primary hover:text-gt-primary"
              style={{ borderStyle: "dashed", borderColor: "var(--color-gt-line)" }}
            >
              <span className="flex flex-col items-center gap-gt-2">
                <PixelIcon name="scan-batch" size={24} />
                <span className="font-gt-display text-gt-2xl font-extrabold leading-none">+</span>
              </span>
            </button>
          ) : null}
        </div>

        {/* counter + fill bar */}
        <div className="mt-gt-12 flex flex-col gap-gt-4">
          <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink-2">{count} de {MAX_IMAGES} imágenes</span>
          <span className="h-1.5 w-full overflow-hidden rounded-gt-pill bg-gt-bg-3">
            <span className="block h-full rounded-gt-pill bg-gt-warning transition-[width] duration-150" style={{ width: `${(count / MAX_IMAGES) * 100}%` }} />
          </span>
        </div>

        {/* cost estimate */}
        <div className="mt-gt-12 flex flex-col gap-gt-4 rounded-gt-xl border-2 border-gt-line bg-gt-bg-3 p-gt-12">
          <span className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Costo estimado</span>
          <span className="font-gt-display text-gt-sm font-bold text-gt-ink-2">{count} boleta{count === 1 ? "" : "s"} × {COST_PER_IMAGE} súper = <span className="font-extrabold text-gt-ink">{cost} súper</span></span>
          <span className={`font-gt-display text-gt-xs font-bold ${remaining >= 0 ? "text-gt-positive" : "text-gt-negative"}`}>
            {remaining >= 0 ? `Créditos restantes: ${remaining}` : `Faltan ${-remaining} súper créditos`}
          </span>
        </div>
      </div>

      {/* footer — Cancelar · Procesar lote */}
      <div className="shrink-0 border-t-2 border-gt-line-strong bg-gt-surface px-gt-16 pb-gt-16 pt-gt-12">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-gt-10">
          <button type="button" aria-label="Cancelar" onClick={onBack} className="grid h-12 w-12 place-items-center rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5">
            <span className="font-gt-display text-gt-xl font-extrabold leading-none">✕</span>
          </button>
          <button
            type="button"
            disabled={!canProcess}
            onClick={() => onProcess?.(count)}
            className="flex h-12 w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-warning font-gt-display text-gt-md font-extrabold text-gt-ink shadow-gt-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <PixelIcon name="scan-batch" size={24} />
            Procesar lote ({count})
          </button>
        </div>
      </div>
    </div>
  );
}
