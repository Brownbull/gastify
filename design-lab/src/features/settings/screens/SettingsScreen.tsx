import { type ReactNode } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { Badge } from "@design-system/atoms/Badge";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { LogOutIcon } from "@design-system/assets/icons";

/**
 * SettingsScreen (Ajustes) — reached from the top-right avatar → PerfilMenu →
 * "Ajustes", mounted as a full-surface overlay via AppScaffold's overlay slot.
 * Its own `settings` AppHeader gives the back arrow (onBack pops the overlay).
 *
 * Container-light layout: rows grouped only by an uppercase heading (no outer
 * card, no divider lines). Icons are shown bare (no framed tile), sized to fill
 * the slot. The destructive "Cerrar sesión" sits at the bottom with the danger
 * tint. Each row fires onSelect(key) (subviews are future work).
 */
export interface SettingsScreenProps {
  onBack?: () => void;
  /** a settings row was chosen (its key). */
  onSelect?: (key: string) => void;
}

interface SettingsRowData {
  key: string;
  label: string;
  subtitle: string;
  /** pixel-icon name, OR pass `svg` for a stroke glyph (e.g. the danger logout). */
  icon?: string;
  svg?: ReactNode;
  badge?: string;
  danger?: boolean;
}
interface SettingsGroup {
  heading: string;
  rows: SettingsRowData[];
}

const GROUPS: SettingsGroup[] = [
  {
    heading: "Cuenta",
    rows: [
      { key: "profile", label: "Perfil", subtitle: "Nombre, correo y foto", icon: "snowshoe-face-wave" },
      { key: "subscription", label: "Suscripción", subtitle: "Plan y créditos de escaneo", icon: "credit-super" },
      { key: "notifications", label: "Notificaciones", subtitle: "Alertas y recordatorios", icon: "nav-alerts" },
    ],
  },
  {
    heading: "Preferencias",
    rows: [
      { key: "limits", label: "Límites de gasto", subtitle: "Límites mensuales por categoría", icon: "fin-budget" },
      { key: "scanning", label: "Escaneo", subtitle: "Moneda y ubicación por defecto", icon: "nav-scan" },
      { key: "preferences", label: "Preferencias de la app", subtitle: "Idioma, fecha y tema", icon: "settings-sliders" },
    ],
  },
  {
    heading: "Datos y privacidad",
    rows: [
      { key: "memory", label: "Mi memoria", subtitle: "Categorización aprendida", icon: "settings-memory" },
      { key: "data", label: "Datos y respaldo", subtitle: "Exporta o restablece tus gastos", icon: "shield-finance" },
    ],
  },
  {
    heading: "Soporte",
    rows: [{ key: "help", label: "Ayuda e información", subtitle: "Acerca de gastify, versión", icon: "status-info" }],
  },
];

const LOGOUT: SettingsRowData = {
  key: "logout",
  label: "Cerrar sesión",
  subtitle: "Cerrar sesión de este dispositivo",
  svg: <LogOutIcon className="h-9 w-9 text-gt-negative" />,
  danger: true,
};

function SettingsRow({ row, onSelect }: { row: SettingsRowData; onSelect?: (key: string) => void }) {
  const danger = row.danger;
  return (
    <button
      type="button"
      onClick={() => onSelect?.(row.key)}
      className={`flex w-full items-center gap-gt-12 px-gt-4 py-gt-10 text-left transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20 ${
        danger ? "hover:bg-gt-negative/10" : "hover:bg-gt-bg-3"
      }`}
    >
      {/* bare icon (no tile), centered in the slot the tile used */}
      <span className="grid h-11 w-11 shrink-0 place-items-center">
        {row.svg ?? (row.icon ? <PixelIcon name={row.icon} size={36} /> : null)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
        <span className={`truncate font-gt-display text-gt-md font-extrabold ${danger ? "text-gt-negative" : "text-gt-ink"}`}>{row.label}</span>
        <span className="truncate text-gt-sm font-medium text-gt-ink-3">{row.subtitle}</span>
      </span>
      {row.badge ? <Badge tone="neutral" className="shrink-0">{row.badge}</Badge> : null}
      {!danger ? (
        <span aria-hidden="true" className="grid shrink-0 place-items-center text-gt-ink-3">
          <span className="h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-current" />
        </span>
      ) : null}
    </button>
  );
}

export function SettingsScreen({ onBack, onSelect }: SettingsScreenProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="settings" title="Ajustes" onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-12" style={{ maxWidth: "42rem" }}>
          {GROUPS.map((g) => (
            <section key={g.heading} className="flex flex-col gap-gt-4">
              <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">{g.heading}</p>
              <div className="flex flex-col">
                {g.rows.map((r) => (
                  <SettingsRow key={r.key} row={r} onSelect={onSelect} />
                ))}
              </div>
            </section>
          ))}
          {/* destructive — gap-separated at the bottom (no divider line) */}
          <SettingsRow row={LOGOUT} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}
