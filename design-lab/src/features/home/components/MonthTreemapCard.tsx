import { Button } from "@design-system/atoms/Button";
import { CameraIcon } from "@design-system/assets/icons";
import type { TreemapBlock } from "../model/HomeScreenModel";

/**
 * "Este Mes" category treemap — static approximation of the legacy squarified
 * treemap (BoletApp DashboardView). Rendered BARE (no Card box) so it uses the
 * full section width; only the hero + insight keep an elevated container.
 * Reference: docs/mockups/screens/gastify-dashboard.html.
 */
export function MonthTreemapCard({ blocks }: { blocks: TreemapBlock[] }) {
  return (
    <section className="flex flex-col gap-gt-10">
      <h3 className="text-gt-lg font-extrabold text-gt-ink">Este Mes</h3>
      {blocks.length === 0 ? (
        <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-gt-xl border-2 border-dashed border-gt-line text-center">
          <p className="text-gt-md text-gt-ink-3">Aún no hay gastos este mes</p>
          <Button size="sm">
            <CameraIcon className="h-4 w-4" />
            Escanear boleta
          </Button>
        </div>
      ) : (
        <div className="grid h-44 grid-cols-4 grid-rows-3 gap-1.5">
          {blocks.map((b) => (
            <div
              key={b.label}
              className={`flex flex-col justify-between overflow-hidden rounded-gt-md p-2 ${b.colorClass} ${b.spanClass}`}
            >
              <span className="text-gt-xs font-semibold text-white">{b.label}</span>
              <span className="text-gt-sm font-bold text-white">{b.amount}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
