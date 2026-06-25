import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { ChevronLeftIcon } from "@design-system/assets/icons";

export interface Correction {
  id: string;
  kind: "establishment-name" | "establishment-category" | "item-name" | "item-category";
  label: string;
  from: string;
  to: string;
}

export interface ScanSaveConfirmScreenProps {
  corrections: Correction[];
  onConfirm: (rememberIds: string[]) => void;
  onBack: () => void;
}

const KIND_LABEL: Record<Correction["kind"], string> = {
  "establishment-name": "Comercio · Nombre",
  "establishment-category": "Comercio · Categoría",
  "item-name": "Ítem · Nombre",
  "item-category": "Ítem · Categoría",
};

function KeepDiscard({ remember, onChange }: { remember: boolean; onChange: (v: boolean) => void }) {
  const base =
    "rounded-gt-pill px-gt-10 py-gt-4 font-gt-display text-gt-xs font-extrabold transition ease-gt-bounce";
  return (
    <div
      role="group"
      aria-label="Recordar o descartar"
      className="inline-flex shrink-0 items-center gap-gt-2 rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg-3 p-px shadow-gt-xs"
    >
      <button
        type="button"
        aria-pressed={remember}
        onClick={() => onChange(true)}
        className={`${base} ${remember ? "bg-gt-primary text-white" : "text-gt-ink-2 hover:text-gt-ink"}`}
      >
        Recordar
      </button>
      <button
        type="button"
        aria-pressed={!remember}
        onClick={() => onChange(false)}
        className={`${base} ${!remember ? "bg-gt-ink text-white" : "text-gt-ink-2 hover:text-gt-ink"}`}
      >
        Descartar
      </button>
    </div>
  );
}

function CorrectionCard({
  correction,
  remember,
  onChange,
}: {
  correction: Correction;
  remember: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-xs">
      <div className="flex items-start justify-between gap-gt-12">
        <div className="min-w-0 flex-1">
          <span className="block font-gt-display text-[10px] font-extrabold uppercase tracking-wide text-gt-ink-3">
            {KIND_LABEL[correction.kind]}
          </span>
          <span className="mt-gt-6 flex flex-wrap items-center gap-gt-6">
            <span className="rounded-gt-md border-2 border-gt-line bg-gt-bg-3 px-gt-8 py-gt-2 font-gt-display text-gt-sm font-extrabold text-gt-ink-2 line-through decoration-gt-ink-3/60">
              {correction.from}
            </span>
            <span aria-hidden="true" className="font-gt-display text-gt-md font-extrabold text-gt-primary">
              →
            </span>
            <span className="rounded-gt-md border-2 border-gt-line-strong bg-gt-surface px-gt-8 py-gt-2 font-gt-display text-gt-sm font-extrabold text-gt-ink shadow-gt-xs">
              {correction.to}
            </span>
          </span>
        </div>
        <KeepDiscard remember={remember} onChange={onChange} />
      </div>
    </li>
  );
}

export function ScanSaveConfirmScreen({ corrections, onConfirm, onBack }: ScanSaveConfirmScreenProps) {
  const [remember, setRemember] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(corrections.map((c) => [c.id, true])),
  );

  function setOne(id: string, value: boolean) {
    setRemember((r) => ({ ...r, [id]: value }));
  }

  function handleConfirm() {
    const ids = corrections.filter((c) => remember[c.id]).map((c) => c.id);
    onConfirm(ids);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <div className="flex items-center gap-gt-10 border-b-2 border-gt-line bg-gt-surface px-gt-16 pb-gt-10 pt-gt-16">
        <button
          type="button"
          aria-label="Volver"
          onClick={onBack}
          className="grid place-items-center text-gt-ink transition hover:-translate-x-0.5"
        >
          <ChevronLeftIcon className="h-7 w-7" />
        </button>
        <h1 className="font-gt-display text-gt-2xl font-extrabold text-gt-ink">Guardar correcciones</h1>
      </div>

      <p className="px-gt-16 pt-gt-12 text-gt-sm text-gt-ink-2">
        Aprendimos algunas correcciones. ¿Cuáles quieres recordar para la próxima vez?
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16">
        {corrections.length === 0 ? (
          <div className="flex flex-col items-center gap-gt-10 py-gt-32 text-center">
            <PixelIcon name="scan-success" size={40} />
            <p className="font-gt-display text-gt-md font-extrabold text-gt-ink-2">
              No hay correcciones para recordar.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-gt-10 py-gt-12">
            {corrections.map((c) => (
              <CorrectionCard
                key={c.id}
                correction={c}
                remember={remember[c.id] ?? true}
                onChange={(v) => setOne(c.id, v)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t-2 border-gt-line-strong bg-gt-surface px-gt-16 pb-gt-32 pt-gt-12">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-gt-10">
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
            className="grid h-12 w-12 place-items-center rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5"
          >
            <span className="font-gt-display text-gt-xl font-extrabold leading-none">✕</span>
          </button>
          <Button variant="success" size="lg" fullWidth onClick={handleConfirm}>
            <PixelIcon name="scan-success" size={24} />
            Confirmar y guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
