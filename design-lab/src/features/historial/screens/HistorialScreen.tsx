import { useState } from "react";
import { ReportDetail } from "@design-system/molecules/ReportDetail";
import { PeriodControl, LATEST_PERIOD_INDEX } from "@design-system/molecules/PeriodControl";
import { SectionFade } from "@design-system/atoms/SectionFade";
import type { Platform } from "@design-system/organisms/AppSurface";
import type { FilterSelection } from "@design-system/organisms/FilterSheet";
import { ComprasScreen } from "@features/compras/screens/ComprasScreen";
import { ItemsBrowseContent } from "@features/gastos/screens/ItemsBrowseContent";
import { TIMEFRAME_REPORTS, type ReportPeriod } from "@lib/reportTimeframeFixtures";
import type { BrowseTransaction } from "@lib/browseFixtures";

/**
 * HistorialScreen (Phase 9 / IA rework) — the 4th-tab "Historial" hub,
 * content-only for AppScaffold (runs in `bleed`; each subsection owns its scroll).
 * A shared PeriodControl band sits at the top, scoping EVERY subsection (the
 * timeframe + period applies to transactions, products, and reports alike). The
 * active subsection is chosen from the HEADER switcher (icons next to the profile)
 * and arrives as the controlled `sub` prop:
 *
 *   Transacciones → ComprasScreen (filter rides the host AppScaffold overlay).
 *   Productos     → ItemsBrowseContent (self-managed overlays).
 *   Reportes      → ReportDetail for the selected timeframe (no own picker — the
 *                   shared PeriodControl drives it).
 */
export type HistorialSub = "transacciones" | "productos" | "reportes";

export interface HistorialScreenProps {
  platform?: Platform;
  /** active subsection — controlled by the header switcher in the host. */
  sub: HistorialSub;
  /** Compras filter selection (host owns it; the FilterSheet rides AppScaffold's overlay). */
  comprasSelection?: FilterSelection;
  onOpenComprasFilter?: () => void;
  /** a transaction was tapped in Transacciones — open its detail (host-owned overlay). */
  onSelectTxn?: (txn: BrowseTransaction) => void;
}

export function HistorialScreen({ platform = "mobile", sub, comprasSelection = {}, onOpenComprasFilter, onSelectTxn }: HistorialScreenProps) {
  const [dimension, setDimension] = useState<ReportPeriod>("monthly");
  const [anchorIndex, setAnchorIndex] = useState(LATEST_PERIOD_INDEX);
  const contentMax = platform === "desktop" ? "56rem" : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* shared period control — scopes every subsection (no divider line; the
          control pills are already self-contained, and the band melts into the
          subsection below — directly into the white search band on Transacciones/
          Productos, or via a SectionFade into the gt-bg (cream) report area on Reportes) */}
      <div className="shrink-0 bg-gt-surface px-gt-16 pb-gt-12 pt-gt-12">
        <div className="mx-auto w-full" style={{ maxWidth: contentMax }}>
          <PeriodControl dimension={dimension} onDimensionChange={setDimension} anchorIndex={anchorIndex} onAnchorChange={setAnchorIndex} />
        </div>
      </div>

      {sub === "transacciones" ? (
        <ComprasScreen platform={platform} selection={comprasSelection} onOpenFilter={onOpenComprasFilter} onSelectTxn={onSelectTxn} />
      ) : sub === "productos" ? (
        <ItemsBrowseContent />
      ) : (
        <>
          <SectionFade />
          <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
            <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-12" style={{ maxWidth: contentMax }}>
              <ReportDetail report={TIMEFRAME_REPORTS[dimension]} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
