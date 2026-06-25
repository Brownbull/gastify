import { useState, type ReactNode } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ChevronDownIcon, ChevronLeftIcon, LogOutIcon, XIcon } from "@design-system/assets/icons";
import { GroupAvatar } from "@design-system/atoms/GroupAvatar";

/**
 * Nav + header chrome (Phase 7, DM-5) — the real navigation/header organisms,
 * rebuilt from the legacy BoletApp "Gastify" shell (NAV-HEADER-SPEC.md). IA =
 * 4 tabs (Inicio·Compras·Gastos·Historial) + scan as a FAB (NOT a tab); Perfil is
 * reached from the top-right avatar dropdown (ProfileMenu), not a tab; legacy and
 * DM-5 agree on the count. Tabs are PixelIcon, icon-only, no text labels (legacy
 * parity). Spikes settle: scan-FAB placement, header density, Perfil treatment,
 * desktop chrome.
 *
 * Replaces the generic AppShell scaffolding (BottomNav/SideNav/AppHeader here are
 * the legacy-studied versions). Presentational-by-default; live behavior via opt-in.
 */

export interface NavTab {
  key: string;
  /** Spanish label (aria + SideNav text). */
  label: string;
  /** pixel-icon name. */
  icon: string;
}

/** The single source of truth — 4 main destinations (DM-5). */
export const MAIN_NAV: NavTab[] = [
  { key: "home", label: "Inicio", icon: "nav-home" },
  { key: "purchases", label: "Compras", icon: "nav-history" },
  { key: "spending", label: "Gastos", icon: "chart-pie" },
  { key: "history", label: "Historial", icon: "nav-historial" },
];

// ── Wordmark + profile avatar ───────────────────────────────────────────
export function Wordmark() {
  return <span className="font-gt-display text-gt-2xl font-extrabold text-gt-primary">gastify</span>;
}

/**
 * ProfileButton — Gustify-faithful: 40×40 circle, filled with primary color,
 * white extrabold initials, ink border, shadow. Matches Gustify's ProfileButton
 * (h-10 w-10 rounded-full border-2 bg-secondary text-white shadow-sm).
 */
export function ProfileButton({ initials = "R", onClick }: { initials?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label="Perfil y ajustes"
      onClick={onClick}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary font-gt-display text-gt-md font-extrabold leading-none text-white shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30"
    >
      <span className="translate-y-px">{initials}</span>
    </button>
  );
}

// ── Scope (Personal / group) switcher ───────────────────────────────────
/** An active workspace: Personal (no color/icon) or a group (emoji + accent). */
export interface NavScope {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

const isGroupScope = (s?: NavScope): s is NavScope & { color: string; icon: string } =>
  !!s && !!s.color && !!s.icon;

/**
 * ScopeTrigger — the top-left brand button: the `gastify` wordmark in Personal,
 * or the group's avatar + name when a group is the active scope. Opens the
 * ScopeMenu. A chevron signals it's switchable.
 */
export function ScopeTrigger({ scope, onClick }: { scope?: NavScope; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cambiar de espacio"
      aria-haspopup="menu"
      className="flex min-w-0 items-center gap-gt-6 rounded-gt-lg px-gt-2 py-gt-2 transition duration-150 ease-gt-bounce hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
    >
      {isGroupScope(scope) ? (
        <>
          <GroupAvatar icon={scope.icon} color={scope.color} size="sm" />
          <span className="min-w-0 truncate font-gt-display text-gt-lg font-extrabold text-gt-ink">{scope.name}</span>
        </>
      ) : (
        <Wordmark />
      )}
      <ChevronDownIcon className="h-4 w-4 shrink-0 text-gt-ink-3" />
    </button>
  );
}

/** ScopeMenu — the dropdown of switchable workspaces (Personal + groups). */
export function ScopeMenu({ scopes, activeId, onSelect }: { scopes: NavScope[]; activeId: string; onSelect?: (id: string) => void }) {
  return (
    <div className="w-64 overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-lg">
      <p className="border-b-2 border-gt-line px-gt-12 py-gt-8 font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Tus espacios</p>
      <ul className="flex flex-col gap-gt-2 p-gt-6">
        {scopes.map((s) => {
          const active = s.id === activeId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect?.(s.id)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-center gap-gt-10 rounded-gt-lg border-2 px-gt-10 py-gt-8 text-left transition duration-150 ease-gt-bounce ${
                  active ? "border-gt-line-strong bg-gt-primary-soft" : "border-transparent hover:bg-gt-bg-3"
                }`}
              >
                {isGroupScope(s) ? (
                  <GroupAvatar icon={s.icon} color={s.color} size="sm" />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-bg-3">
                    <PixelIcon name="nav-profile" size={20} />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{s.name}</span>
                {active ? <span className="shrink-0 font-gt-display text-gt-md font-extrabold text-gt-primary">✓</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Bottom nav (mobile/tablet) ──────────────────────────────────────────
export interface BottomNavProps {
  active: string;
  onSelect?: (key: string) => void;
  items?: NavTab[];
  alertsTab?: string; // tab key that carries the alerts dot
  /** group accent hex — tints the bar (gradient) + the active tab for a group scope. */
  accentColor?: string;
  className?: string;
}

export function BottomNav({ active, onSelect, items = MAIN_NAV, alertsTab, accentColor, className = "" }: BottomNavProps) {
  // Gustify nav-bar geometry (3px ink top edge, 4-col grid, generous top pad,
  // 32px tab icons, filled-active tab) with gastify colors.
  return (
    <nav
      aria-label="Navegación principal"
      className={`mt-gt-2 grid grid-cols-4 items-stretch gap-gt-4 border-t-[3px] border-gt-line-strong px-gt-6 pb-gt-2 pt-gt-6 ${accentColor ? "" : "bg-gt-surface"} ${className}`}
      style={accentColor ? { background: `linear-gradient(to top, ${accentColor}33, var(--color-gt-surface) 75%)` } : undefined}
    >
      {items.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSelect?.(tab.key)}
            style={isActive && accentColor ? { backgroundColor: `${accentColor}40` } : undefined}
            className={`relative flex min-w-0 flex-col items-center gap-gt-2 rounded-gt-2xl border-2 px-gt-4 pb-gt-4 pt-gt-6 font-gt-display font-extrabold transition duration-150 ease-gt-bounce ${
              isActive
                ? `border-gt-line-strong shadow-gt-xs ${accentColor ? "text-gt-ink" : "bg-gt-primary-soft text-gt-primary"}`
                : "border-transparent text-gt-ink-3 hover:border-gt-line hover:bg-gt-bg-3"
            }`}
          >
            <PixelIcon name={tab.icon} size={32} className={isActive ? "" : "opacity-60"} />
            <span className="truncate text-[10px] leading-tight">{tab.label}</span>
            {alertsTab === tab.key ? (
              <span aria-hidden="true" className="absolute right-gt-6 top-gt-4 h-2.5 w-2.5 rounded-full border-2 border-gt-surface bg-gt-negative" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

// ── Side nav (desktop) ──────────────────────────────────────────────────
export interface SideNavProps {
  active: string;
  onSelect?: (key: string) => void;
  items?: NavTab[];
  /** collapsed icon-only rail (toggled by the options/collapse button). */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** profile block at the bottom. */
  profileName?: string;
  profileEmail?: string;
  onProfile?: () => void;
  /** active scope + handler — the wordmark becomes a ScopeTrigger when set. */
  scope?: NavScope;
  onScopeClick?: () => void;
  /** group accent hex — tints the rail (gradient) + the active row for a group scope. */
  accentColor?: string;
  className?: string;
}

/**
 * SideNav (desktop) — the Gustify left panel: a wordmark header with the
 * options/collapse icon top-right, icon+label nav rows (filled-active), and a
 * profile block at the bottom. Collapses to an icon rail. Gustify geometry,
 * gastify colors.
 */
export function SideNav({
  active,
  onSelect,
  items = MAIN_NAV,
  collapsed = false,
  onToggleCollapse,
  profileName = "Rosa",
  profileEmail = "rosa@correo.cl",
  onProfile,
  scope,
  onScopeClick,
  accentColor,
  className = "",
}: SideNavProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className={`flex shrink-0 flex-col border-r-2 border-gt-line-strong p-gt-12 ${accentColor ? "" : "bg-gt-surface"} ${collapsed ? "w-18 items-center" : "w-60"} ${className}`}
      style={accentColor ? { background: `linear-gradient(to bottom, ${accentColor}33, var(--color-gt-surface) 45%)` } : undefined}
    >
      {/* header: scope trigger / wordmark + the options/collapse icon top-right */}
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} py-gt-8`}>
        {collapsed ? null : onScopeClick ? <ScopeTrigger scope={scope} onClick={onScopeClick} /> : <Wordmark />}
        <button
          type="button"
          aria-label={collapsed ? "Expandir navegación" : "Opciones de navegación"}
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-md border-2 border-gt-line bg-gt-surface text-gt-ink-2 transition hover:-translate-y-0.5 hover:border-gt-line-strong hover:text-gt-ink"
        >
          <ChevronLeftIcon className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <ul className="mt-gt-8 flex flex-1 flex-col gap-gt-8">
        {items.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key}>
              <button
                type="button"
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? tab.label : undefined}
                onClick={() => onSelect?.(tab.key)}
                style={isActive && accentColor ? { backgroundColor: `${accentColor}40` } : undefined}
                className={`flex w-full items-center rounded-gt-lg border-2 font-gt-display text-gt-md font-extrabold transition duration-150 ease-gt-bounce ${
                  collapsed ? "justify-center px-gt-8 py-gt-8" : "gap-gt-10 px-gt-12 py-gt-8"
                } ${
                  isActive
                    ? `border-gt-line-strong shadow-gt-xs ${accentColor ? "text-gt-ink" : "bg-gt-primary-soft text-gt-primary"}`
                    : "border-gt-line bg-gt-surface text-gt-ink-2 hover:border-gt-line-strong hover:text-gt-ink"
                }`}
              >
                <PixelIcon name={tab.icon} size={collapsed ? 28 : 24} className={isActive ? "" : "opacity-70"} />
                {collapsed ? null : <span>{tab.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {/* profile block at the bottom */}
      <button
        type="button"
        onClick={onProfile}
        className={`mt-gt-8 flex items-center gap-gt-8 rounded-gt-lg border-2 border-gt-line bg-gt-surface p-gt-8 text-left transition hover:border-gt-line-strong ${collapsed ? "justify-center" : ""}`}
      >
        <ProfileButton initials={profileName[0]} />
        {collapsed ? null : (
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{profileName}</span>
            <span className="truncate text-gt-xs font-medium text-gt-ink-3">{profileEmail}</span>
          </span>
        )}
      </button>
    </nav>
  );
}

// ── App header (one flexible organism, variant-driven) ──────────────────
export type HeaderVariant = "home" | "browse" | "detail" | "settings" | "period";

export interface AppHeaderProps {
  variant?: HeaderVariant;
  title?: string;
  subtitle?: ReactNode;
  /** replaces the wordmark in the "home" variant (e.g. the scope trigger). */
  brand?: ReactNode;
  /** trailing action slot (search/filter/period steppers) before the avatar. */
  actions?: ReactNode;
  /** optional second band under the header row (search/sort/export). */
  band?: ReactNode;
  onBack?: () => void;
  onProfile?: () => void;
  avatarInitials?: string;
  /** when set, the top-right shows a bare X (close/cancel) instead of the
   * profile avatar — e.g. flow screens the user can abandon at any step. */
  onClose?: () => void;
  className?: string;
}

export function AppHeader({
  variant = "home",
  title,
  subtitle,
  brand,
  actions,
  band,
  onBack,
  onProfile,
  avatarInitials = "R",
  onClose,
  className = "",
}: AppHeaderProps) {
  const showBack = (variant === "detail" || variant === "settings") && onBack != null;
  return (
    <header className={`flex flex-col bg-gt-surface ${className}`}>
      {/* top inset clears the AppSurface notch (26px) so the title isn't hidden */}
      <div className="flex items-center gap-gt-8 px-gt-16 pb-gt-10 pt-gt-16">
        {showBack ? (
          // bare arrow, far-left, NO container/circle (gastify-specific deviation).
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
            className="-ml-gt-4 grid h-8 w-8 shrink-0 place-items-center text-gt-ink transition hover:-translate-x-0.5"
          >
            <ChevronLeftIcon className="h-7 w-7" />
          </button>
        ) : null}

        {variant === "home" ? (
          brand ?? <Wordmark />
        ) : (
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate font-gt-display text-gt-3xl font-extrabold leading-tight text-gt-ink">{title}</h1>
            {subtitle ? <span className="truncate text-gt-xs font-medium text-gt-ink-3">{subtitle}</span> : null}
          </div>
        )}

        <span className="flex-1" />
        {actions ? <span className="flex shrink-0 items-center gap-gt-6">{actions}</span> : null}
        {onClose ? (
          // bare X (close/cancel), far-right — mirrors the bare back arrow.
          <button
            type="button"
            aria-label="Cancelar"
            onClick={onClose}
            className="-mr-gt-4 grid h-8 w-8 shrink-0 place-items-center text-gt-ink transition hover:scale-110"
          >
            <XIcon className="h-7 w-7" />
          </button>
        ) : (
          <ProfileButton initials={avatarInitials} onClick={onProfile} />
        )}
      </div>
      {band ? <div className="px-gt-16 pb-gt-8">{band}</div> : null}
    </header>
  );
}

/**
 * HeaderAction — CONTAINED action button (40×40 box, ink border, shadow) hugging
 * a large 32px glyph (snug padding) so subsection icons read clearly without an
 * oversized container. Use when the action navigates to a subsection.
 */
export function HeaderAction({ icon, label, onClick, active = false }: { icon: string; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-gt-md border-2 transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30 ${
        active
          ? "border-gt-line-strong bg-gt-primary text-white shadow-gt-sm"
          : "border-gt-line bg-gt-surface hover:-translate-y-0.5 hover:border-gt-line-strong hover:shadow-gt-xs"
      }`}
    >
      <PixelIcon name={icon} size={32} />
    </button>
  );
}

/**
 * BareAction — bare icon button (no container/border/shadow). Use when the
 * action is an in-place option (filter, sort, export) rather than a subsection
 * navigation. Just the icon, hover opacity change.
 */
export function BareAction({ icon, label, onClick, badge }: { icon: string; label: string; onClick?: () => void; badge?: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="relative grid h-10 w-10 shrink-0 place-items-center text-gt-ink-2 transition duration-150 hover:text-gt-ink"
    >
      <PixelIcon name={icon} size={28} />
      {badge != null && badge > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-gt-surface bg-gt-primary text-[10px] font-extrabold leading-none text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

// ── Add-transaction FAB — Gustify square-plus; tap opens the scan-mode sheet ──
export type ScanMode = "single" | "batch" | "statement";
export type ScanFabPlacement = "corner" | "title" | "bar-center";

const SCAN_MODE_META: { id: ScanMode; icon: string; label: string; cost: string }[] = [
  { id: "single", icon: "scan-single", label: "Escaneo simple", cost: "1 crédito" },
  { id: "batch", icon: "scan-batch", label: "Escaneo por lote", cost: "1 súper" },
  { id: "statement", icon: "scan-statement", label: "Estado de cuenta", cost: "1 súper" },
];

export interface ScanFabProps {
  placement?: ScanFabPlacement;
  mode?: ScanMode; // unused for the icon now (always "+"); kept for API compat
  onScan?: () => void; // fired with the picked mode via onModeSelect
  onModeSelect?: (mode: ScanMode) => void;
  /**
   * true (default) → tapping opens the inline scan-mode popover. false → the
   * button fires `onScan` directly, letting the host open the full-screen mode
   * chooser (ScanModeChooserScreen) instead.
   */
  withMenu?: boolean;
  className?: string;
}

/**
 * The floating "add a transaction" button — Gustify's SQUARE-PLUS shape (52×52,
 * rounded-gt-lg square, NOT a circle; a literal "+" glyph). Tapping it opens the
 * scan-mode sheet (single / batch / statement) — the "+" means "add a
 * transaction", the modes are how. Geometry from Gustify, colors from gastify.
 */
export function ScanFab({ placement = "corner", onScan, onModeSelect, withMenu = true, className = "" }: ScanFabProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const pos =
    placement === "corner"
      ? "absolute bottom-20 right-gt-16 z-40" // anchors to the AppSurface frame (relative)
      : placement === "bar-center"
        ? "absolute -top-7 left-1/2 -translate-x-1/2 z-40"
        : "relative"; // title — inline in the page title row

  return (
    <div className={`${pos} ${className}`}>
      <button
        type="button"
        aria-label="Agregar transacción"
        onClick={() => (withMenu ? setMenuOpen((o) => !o) : onScan?.())}
        className="grid h-13 w-13 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-primary font-gt-display text-gt-4xl font-extrabold leading-none text-white shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30"
      >
        +
      </button>

      {/* long-press / right-click mode selector popover */}
      {withMenu && menuOpen ? (
        <div
          role="menu"
          className={`absolute ${placement === "title" ? "left-0 top-full mt-gt-8" : "bottom-full right-0 mb-gt-8"} w-60 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-8 shadow-gt-md`}
        >
          <p className="px-gt-8 pb-gt-4 pt-gt-2 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Agregar transacción</p>
          {SCAN_MODE_META.map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onModeSelect?.(m.id);
                onScan?.();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-gt-8 rounded-gt-lg px-gt-8 py-gt-8 text-left transition-colors hover:bg-gt-bg-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-bg-3">
                <PixelIcon name={m.icon} size={22} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{m.label}</span>
                <span className="text-gt-xs font-medium text-gt-ink-3">{m.cost}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Perfil menu — grouped treatment (DM-41 = spike Option C) ────────────
/**
 * The profile menu opened from the top-right avatar (mobile/tablet) or the
 * desktop rail. Six destinations; a divider sets the destructive "Cerrar
 * sesión" apart (logout tinted danger). `icon: "svg:logout"` renders the
 * LogOutIcon glyph; all others are pixel-icons. `badge` shows a count pill
 * (Notificaciones). The list is data-driven — a `divider: true` item draws the
 * separator before it.
 */
export interface ProfileMenuItem {
  key: string;
  label: string;
  icon: string;
  /** draw a divider ABOVE this item (groups the destructive action). */
  divider?: boolean;
  /** danger tint (destructive action, e.g. logout). */
  danger?: boolean;
  disabled?: boolean;
  /** count pill (e.g. unread notifications). */
  badge?: string;
}

// Historial de productos / transacciones + Reportes moved to the Historial tab
// (the avatar dropdown is now just account-level actions).
export const PROFILE_MENU: ProfileMenuItem[] = [
  { key: "notifications", label: "Notificaciones", icon: "nav-alerts", badge: "3" },
  { key: "groups", label: "Grupos", icon: "settings-groups" },
  { key: "statements", label: "Cartolas", icon: "scan-statement" },
  { key: "settings", label: "Ajustes", icon: "nav-settings" },
  { key: "logout", label: "Cerrar sesión", icon: "svg:logout", danger: true, divider: true },
];

function ProfileMenuRow({ item, onSelect }: { item: ProfileMenuItem; onSelect?: (key: string) => void }) {
  return (
    <button
      type="button"
      disabled={item.disabled}
      onClick={() => onSelect?.(item.key)}
      className={`flex w-full items-center gap-gt-10 rounded-gt-lg px-gt-10 py-gt-8 text-left font-gt-display text-gt-sm font-extrabold transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/20 disabled:opacity-50 ${
        item.danger ? "text-gt-negative hover:bg-gt-negative/10" : "text-gt-ink hover:bg-gt-warning/20"
      }`}
    >
      {item.icon === "svg:logout" ? (
        <LogOutIcon className="h-6 w-6 shrink-0 text-gt-negative" />
      ) : (
        <PixelIcon name={item.icon} size={24} className="shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-negative px-gt-4 text-[10px] font-extrabold leading-none text-white">
          {item.badge}
        </span>
      ) : null}
    </button>
  );
}

export function ProfileMenu({
  name = "Rosa",
  email = "rosa@correo.cl",
  items = PROFILE_MENU,
  onSelect,
  className = "",
}: {
  name?: string;
  email?: string;
  items?: ProfileMenuItem[];
  onSelect?: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={`w-72 overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md ${className}`}>
      {/* user header */}
      <div className="flex items-center gap-gt-10 border-b-2 border-gt-line bg-gt-bg-3 px-gt-12 py-gt-12">
        <ProfileButton initials={name[0]} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{name}</span>
          <span className="truncate text-gt-xs font-medium text-gt-ink-3">{email}</span>
        </span>
      </div>
      {/* grouped destinations + divider before the destructive action */}
      <div className="flex flex-col p-gt-8">
        {items.map((it) => (
          <div key={it.key}>
            {it.divider ? <div className="my-gt-6 border-t-2 border-gt-line" /> : null}
            <ProfileMenuRow item={it} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}
