import { useState } from "react";
import { Button } from "@design-system/atoms/Button";
import { Switch } from "@design-system/atoms/Switch";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { SettingsSubviewShell, SettingsGroupHeading } from "../components/SettingsSubviewShell";
import { SettingsUsageBar, clp } from "../components/SettingsUsageBar";

/**
 * Límites de gasto subview — a master monthly-limits Switch, the total-budget
 * meter, then a per-category list (icon · name · spent/limit · usage bar that
 * reddens when over). Toggling the master off collapses the budgets.
 * Presentational mockup; rows are inert (tap-to-edit is future work).
 */
interface CategoryLimit {
  id: string;
  icon: string;
  name: string;
  spent: number;
  limit: number;
}

const TOTAL_SPENT = 520000;
const TOTAL_LIMIT = 800000;

const CATEGORY_LIMITS: CategoryLimit[] = [
  { id: "supermercados", icon: "rubro-supermercados", name: "Supermercados", spent: 182000, limit: 200000 },
  { id: "restaurantes", icon: "rubro-restaurantes", name: "Restaurantes", spent: 96000, limit: 120000 },
  { id: "transporte", icon: "rubro-transporte-vehiculo", name: "Transporte", spent: 61000, limit: 80000 },
  { id: "entretenimiento", icon: "rubro-entretenimiento-hospedaje", name: "Entretenimiento", spent: 54000, limit: 40000 },
  { id: "salud", icon: "rubro-salud-bienestar", name: "Salud y bienestar", spent: 27000, limit: 60000 },
];

function CategoryLimitRow({ row }: { row: CategoryLimit }) {
  const over = row.spent > row.limit;
  return (
    <div className="flex flex-col gap-gt-6 px-gt-4 py-gt-10">
      <div className="flex items-center gap-gt-12">
        <span className="grid h-11 w-11 shrink-0 place-items-center">
          <PixelIcon name={row.icon} size={36} />
        </span>
        <span className="min-w-0 flex-1 truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{row.name}</span>
        <span className={`shrink-0 text-gt-sm font-bold ${over ? "text-gt-negative" : "text-gt-ink-3"}`}>
          {clp(row.spent)} / {clp(row.limit)}
        </span>
      </div>
      <SettingsUsageBar value={row.spent} max={row.limit} />
    </div>
  );
}

export function LimitsSubview({ onBack }: { onBack?: () => void }) {
  const [enabled, setEnabled] = useState(true);

  return (
    <SettingsSubviewShell title="Límites de gasto" onBack={onBack}>
      {/* master toggle */}
      <div className="flex items-center gap-gt-12 px-gt-4 py-gt-10">
        <span className="grid h-11 w-11 shrink-0 place-items-center">
          <PixelIcon name="fin-budget" size={36} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
          <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Límites mensuales</span>
          <span className="text-gt-sm font-medium text-gt-ink-3">Avísame cuando me acerque a un límite</span>
        </span>
        <Switch checked={enabled} onChange={setEnabled} label="Límites mensuales" />
      </div>

      {enabled ? (
        <>
          {/* total budget */}
          <SettingsGroupHeading>Límite total</SettingsGroupHeading>
          <div className="flex flex-col gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12 shadow-gt-sm">
            <div className="flex items-end justify-between gap-gt-8">
              <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{clp(TOTAL_SPENT)}</span>
              <span className="shrink-0 text-gt-sm font-bold text-gt-ink-3">de {clp(TOTAL_LIMIT)}</span>
            </div>
            <SettingsUsageBar value={TOTAL_SPENT} max={TOTAL_LIMIT} />
          </div>

          {/* per category */}
          <SettingsGroupHeading>Por categoría</SettingsGroupHeading>
          <div className="flex flex-col">
            {CATEGORY_LIMITS.map((row) => (
              <CategoryLimitRow key={row.id} row={row} />
            ))}
          </div>
          <Button variant="secondary" fullWidth>Agregar límite de categoría</Button>
        </>
      ) : null}
    </SettingsSubviewShell>
  );
}
