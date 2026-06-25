import { useState } from "react";
import type { Platform } from "@design-system/organisms/AppSurface";
import { PeriodControl, LATEST_PERIOD_INDEX } from "@design-system/molecules/PeriodControl";
import { TrendsRepresentations, type SpendRepresentation } from "../components/TrendsRepresentations";
import { type ReportPeriod } from "@lib/reportTimeframeFixtures";
import { type CountMode } from "@lib/analyticsFixtures";

/**
 * SpendingScreen (Phase 9) — the spending-analytics tab, content-only for
 * AppScaffold. Shows the three spending representations (Dona / Mapa / Flujo);
 * the active one is chosen from the HEADER (diagram icon-buttons next to the
 * profile) and arrives as the controlled `rep` prop. Above the diagram sits the
 * shared PeriodControl (S/M/T/A picker + draggable period navigator). One column,
 * capped + centered on desktop.
 */
export interface SpendingScreenProps {
  platform?: Platform;
  /** active spending representation — controlled by the header switcher in the host. */
  rep: SpendRepresentation;
  /** a section's ICON (donut/treemap) was tapped — open its detail report (host-owned overlay). */
  onOpenCategory?: (id: string) => void;
  /** a section's COUNT pill was tapped — open its transactions/items in history (host-owned overlay). */
  onOpenHistory?: (id: string, mode: CountMode) => void;
}

export function SpendingScreen({ platform = "mobile", rep, onOpenCategory, onOpenHistory }: SpendingScreenProps) {
  const [dimension, setDimension] = useState<ReportPeriod>("monthly");
  const [anchorIndex, setAnchorIndex] = useState(LATEST_PERIOD_INDEX);
  const contentMax = platform === "desktop" ? "60rem" : undefined;

  return (
    <div className="mx-auto flex h-full w-full flex-col gap-gt-12 pt-gt-4" style={{ maxWidth: contentMax }}>
      <PeriodControl dimension={dimension} onDimensionChange={setDimension} anchorIndex={anchorIndex} onAnchorChange={setAnchorIndex} />
      <TrendsRepresentations rep={rep} onOpenCategory={onOpenCategory} onOpenHistory={onOpenHistory} />
    </div>
  );
}
