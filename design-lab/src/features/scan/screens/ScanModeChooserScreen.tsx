import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";

/**
 * ScanModeChooserScreen (DM-43 / DM-5) — the scan "front door" the scan FAB
 * opens: pick how to register an expense. Three routes — Escanear boleta (the
 * single-receipt photo flow), Subir cartola (the credit-card statement flow),
 * or Ingreso manual (type it in, no AI). The first two are AI-powered (violet /
 * pink); manual is the plain path (slate). A full-bleed flex column with the X
 * to dismiss the chooser.
 */
export interface ScanModeChooserScreenProps {
  onSingle?: () => void;
  onStatement?: () => void;
  onManual?: () => void;
  /** dismiss the chooser. */
  onClose?: () => void;
}

interface ModeCard {
  key: string;
  icon: string;
  title: string;
  desc: string;
  tint: string;
}

const MODES: ModeCard[] = [
  { key: "single", icon: "action-camera", title: "Escanear boleta", desc: "Toma una foto de tu recibo", tint: "rgba(139,92,246,0.10)" },
  { key: "statement", icon: "scan-statement", title: "Subir cartola", desc: "Sube el PDF de tu estado de cuenta", tint: "rgba(244,114,182,0.12)" },
  { key: "manual", icon: "fin-receipt", title: "Ingreso manual", desc: "Ingresa los datos a mano", tint: "rgba(30,41,59,0.06)" },
];

function ModeOption({ mode, onPress }: { mode: ModeCard; onPress?: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex items-center gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 text-left shadow-gt-sm transition hover:-translate-y-0.5"
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong" style={{ backgroundColor: mode.tint }}>
        <PixelIcon name={mode.icon} size={36} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-gt-display text-gt-lg font-extrabold text-gt-ink">{mode.title}</span>
        <span className="block text-gt-sm font-medium text-gt-ink-3">{mode.desc}</span>
      </span>
      <span aria-hidden="true" className="h-3 w-3 shrink-0 -rotate-45 border-b-2 border-r-2 border-gt-ink-3" />
    </button>
  );
}

export function ScanModeChooserScreen({ onSingle, onStatement, onManual, onClose }: ScanModeChooserScreenProps) {
  const handlers: Record<string, (() => void) | undefined> = { single: onSingle, statement: onStatement, manual: onManual };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Escanear" onClose={onClose ?? (() => {})} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="flex flex-col gap-gt-12 pt-gt-12">
          <p className="text-center text-gt-sm font-medium text-gt-ink-2">
            <span className="font-extrabold text-gt-ink">¿Cómo quieres registrar tu gasto?</span>
          </p>
          <div className="flex flex-col gap-gt-10">
            {MODES.map((m) => (
              <ModeOption key={m.key} mode={m} onPress={handlers[m.key]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
