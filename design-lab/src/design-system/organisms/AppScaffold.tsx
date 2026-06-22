import { useState, type CSSProperties, type ReactNode } from "react";
import type { Platform } from "./AppSurface";
import { AppHeader, BottomNav, SideNav, ScanFab, MAIN_NAV, PerfilMenu, type NavTab } from "./Nav";

/**
 * AppScaffold (Phase 7, DM-5) — the composed application frame every screen
 * lives in. Wires the settled nav organisms (AppHeader / SideNav / BottomNav /
 * ScanFab) into a platform-aware shell:
 *
 *   - desktop  → SideNav (left) + a content pane with a title row that carries
 *     the ScanFab inline next to the title; overlays cover the content pane.
 *   - mobile/tablet → AppHeader (top) + scrolling content + the ScanFab in the
 *     bottom-right corner + the 4-tab BottomNav; overlays cover the whole frame.
 *
 * The ScanFab is wired to fire `onScan` (withMenu=false) so the host opens the
 * full-screen mode chooser (ScanModeChooserScreen) — passed back in via
 * `overlay`. Presentational-by-default; live behavior via opt-in callbacks.
 * Renders inside an AppSurface device frame.
 */
export interface AppScaffoldProps {
  platform: Platform;
  /** active main-nav key. */
  active: string;
  onSelect?: (key: string) => void;
  items?: NavTab[];
  /** page title (mobile header / desktop title row). Omit to show the wordmark. */
  title?: string;
  /** FAB press — the host opens the mode chooser. */
  onScan?: () => void;
  /** avatar press — kept for back-compat; the avatar now also toggles the PerfilMenu dropdown. */
  onProfile?: () => void;
  /** a PerfilMenu row was chosen from the avatar dropdown. */
  onProfileSelect?: (key: string) => void;
  /** identity shown in the avatar dropdown header (defaults to the PerfilMenu defaults). */
  profileName?: string;
  profileEmail?: string;
  /**
   * header subsection switcher (Gustify pattern): contained icon buttons shown
   * top-right — before the avatar on mobile/tablet, in the title row on desktop.
   * Use HeaderAction buttons to jump between a section's subsections.
   */
  headerActions?: ReactNode;
  /** nav key that carries the alerts dot. */
  alertsTab?: string;
  children: ReactNode;
  /**
   * raw content area — no scroll/padding wrapper. Use for screens that manage
   * their OWN sticky sub-header + scroll + internal overlay (e.g. a browse
   * screen with a search/filter band). Default (false) wraps children in a
   * padded `overflow-y-auto` column (simple content screens like Inicio).
   */
  bleed?: boolean;
  /**
   * full-surface overlay (e.g. the scan mode chooser): covers the whole frame
   * on mobile/tablet, the content pane on desktop.
   */
  overlay?: ReactNode;
}

export function AppScaffold({
  platform,
  active,
  onSelect,
  items = MAIN_NAV,
  title,
  onScan,
  onProfile,
  onProfileSelect,
  profileName,
  profileEmail,
  headerActions,
  alertsTab,
  children,
  bleed = false,
  overlay,
}: AppScaffoldProps) {
  const content = bleed ? (
    <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
  ) : (
    <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">{children}</div>
  );

  // the top-right avatar opens the PerfilMenu as a small anchored dropdown
  // (transparent click-outside backdrop). State lives here so hosts only wire
  // onProfileSelect; the existing onProfile hook still fires for back-compat.
  const [profileOpen, setProfileOpen] = useState(false);
  const toggleProfile = () => { setProfileOpen((o) => !o); onProfile?.(); };
  const closeProfile = () => setProfileOpen(false);
  const profileDropdown = (pos: CSSProperties) =>
    profileOpen ? (
      <>
        <button type="button" aria-label="Cerrar menú" onClick={closeProfile} className="absolute z-40" style={{ inset: 0 }} />
        <div className="absolute z-50" style={pos}>
          <PerfilMenu name={profileName} email={profileEmail} onSelect={(k) => { onProfileSelect?.(k); closeProfile(); }} />
        </div>
      </>
    ) : null;

  if (platform === "desktop") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden bg-gt-bg">
        <SideNav active={active} onSelect={onSelect} items={items} onProfile={toggleProfile} />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-gt-12 px-gt-16 pb-gt-12 pt-gt-16">
            <h1 className="min-w-0 flex-1 truncate font-gt-display text-gt-3xl font-extrabold text-gt-ink">{title ?? "Inicio"}</h1>
            {headerActions ? <span className="flex shrink-0 items-center gap-gt-6">{headerActions}</span> : null}
            <ScanFab placement="title" withMenu={false} onScan={onScan} />
          </div>
          {content}
          {profileDropdown({ bottom: 16, left: 16 })}
          {overlay ? <div className="absolute inset-0 z-50 flex flex-col">{overlay}</div> : null}
        </div>
      </div>
    );
  }

  // mobile / tablet
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      {title ? (
        <AppHeader variant="browse" title={title} actions={headerActions} onProfile={toggleProfile} />
      ) : (
        <AppHeader variant="home" actions={headerActions} onProfile={toggleProfile} />
      )}
      {profileDropdown({ top: 60, right: 16 })}
      {content}
      <ScanFab placement="corner" withMenu={false} onScan={onScan} />
      <BottomNav active={active} onSelect={onSelect} items={items} alertsTab={alertsTab} />
      {overlay ? <div className="absolute inset-0 z-50 flex flex-col">{overlay}</div> : null}
    </div>
  );
}
