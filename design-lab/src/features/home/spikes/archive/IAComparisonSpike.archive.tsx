/* ARCHIVED 2026-06-16 (DM-2/DM-5): IA comparison (11-entry vs 4-tab+scan-FAB). IA is
   locked = Gustify 4-tab + scan FAB; this side-by-side composite is kept for
   provenance and excluded from the glob via its archived story (*.archive.tsx). */
import { HomeScreen } from "../../screens/HomeScreen";

/**
 * SPIKE — IA decision surface (PLAN-MOCKUPS Phase 3). Pure composition over
 * the real HomeScreen; no spike-local UI. Archived once the user picks a
 * candidate (consolidation policy: spikes are decision surfaces, not
 * destinations).
 */

/** Both mobile candidates side by side — the decision shot. */
export function MobileSideBySide() {
  return (
    <div className="flex flex-wrap items-start justify-center gap-10 bg-gt-bg p-8">
      <figure className="flex flex-col items-center gap-3">
        <figcaption className="text-gt-lg font-semibold text-gt-ink">
          A · IA actual (web) — 11 destinos, menú hamburguesa
        </figcaption>
        <HomeScreen platform="mobile" ia="current" menuOpen />
      </figure>
      <figure className="flex flex-col items-center gap-3">
        <figcaption className="text-gt-lg font-semibold text-gt-ink">
          B · IA rediseñada (2026-03) — 5 pestañas iguales
        </figcaption>
        <HomeScreen platform="mobile" ia="redesigned" />
      </figure>
    </div>
  );
}

/** Both desktop candidates stacked for visual comparison. */
export function DesktopComparison() {
  return (
    <div className="flex flex-col gap-10 bg-gt-bg p-8">
      <figure className="flex flex-col gap-3">
        <figcaption className="text-gt-lg font-semibold text-gt-ink">
          A · IA actual (web) — sidebar de 11 destinos
        </figcaption>
        <HomeScreen platform="desktop" ia="current" />
      </figure>
      <figure className="flex flex-col gap-3">
        <figcaption className="text-gt-lg font-semibold text-gt-ink">
          B · IA rediseñada (2026-03) — sidebar de 5 + perfil
        </figcaption>
        <HomeScreen platform="desktop" ia="redesigned" />
      </figure>
    </div>
  );
}
