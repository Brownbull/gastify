import { useState, type ReactNode } from "react";
import { PixelIcon } from "./PixelIcon";
import { ChevronLeftIcon, LogOutIcon, XIcon } from "./icons";

/**
 * Nav + header chrome (Playful Geometric, DM-5) — ported from design-lab's
 * Nav organism into the live web app (W2). IA = 4 tabs
 * (Inicio·Compras·Gastos·Historial) + scan as a FAB (NOT a tab); Perfil is the
 * top-right avatar dropdown (ProfileMenu), not a tab. Presentational — the live
 * web AppLayout wires `active`/`onSelect` to TanStack Router + the data hooks.
 *
 * The design-lab scope switcher (ScopeTrigger/ScopeMenu) is intentionally NOT
 * ported here — web keeps its existing wired GroupSwitcher for scope.
 */

export interface NavTab {
  key: string;
  /** display label (aria + SideNav text). */
  label: string;
  /** pixel-icon name. */
  icon: string;
}

// ── Wordmark + profile avatar ───────────────────────────────────────────
export function Wordmark() {
  return <span className="font-gt-display text-gt-2xl font-extrabold text-gt-primary">gastify</span>;
}

/**
 * ProfileButton — 40×40 circle, primary fill, white extrabold initials, ink
 * border, hard offset shadow, bounce on hover.
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

/**
 * AvatarCircle — the avatar visual as a NON-interactive span, for nesting
 * inside a clickable profile row without an invalid nested <button>.
 */
function AvatarCircle({ initials = "R" }: { initials?: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary font-gt-display text-gt-md font-extrabold leading-none text-white shadow-gt-sm"
    >
      <span className="translate-y-px">{initials}</span>
    </span>
  );
}

// ── Bottom nav (mobile/tablet) ──────────────────────────────────────────
export interface BottomNavProps {
  active: string;
  onSelect?: (key: string) => void;
  items: NavTab[];
  /** tab key that carries the alerts dot. */
  alertsTab?: string;
  className?: string;
}

export function BottomNav({ active, onSelect, items, alertsTab, className = "" }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className={`grid grid-cols-4 items-stretch gap-gt-4 border-t-[3px] border-gt-line-strong bg-gt-surface px-gt-6 pb-gt-2 pt-gt-6 ${className}`}
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
            className={`relative flex min-w-0 flex-col items-center gap-gt-2 rounded-gt-2xl border-2 px-gt-4 pb-gt-4 pt-gt-6 font-gt-display font-extrabold transition duration-150 ease-gt-bounce ${
              isActive
                ? "border-gt-line-strong bg-gt-primary-soft text-gt-primary shadow-gt-xs"
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
  items: NavTab[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  profileName?: string;
  profileEmail?: string;
  onProfile?: () => void;
  /** replaces the wordmark in the header (e.g. the scope-switcher logo). */
  brand?: ReactNode;
  /** extra content under the nav list. */
  belowNav?: ReactNode;
  className?: string;
}

/**
 * SideNav (desktop) — left panel: wordmark header with a collapse toggle,
 * icon+label nav rows (filled-active), optional content below, and a profile
 * block at the bottom. Collapses to an icon rail.
 */
export function SideNav({
  active,
  onSelect,
  items,
  collapsed = false,
  onToggleCollapse,
  profileName = "Rosa",
  profileEmail = "rosa@correo.cl",
  onProfile,
  brand,
  belowNav,
  className = "",
}: SideNavProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className={`flex shrink-0 flex-col border-r-2 border-gt-line-strong bg-gt-surface p-gt-12 ${collapsed ? "w-18 items-center" : "w-60"} ${className}`}
    >
      {/* header: brand (scope-switcher logo, or wordmark) + the collapse toggle */}
      <div className={`flex py-gt-8 ${collapsed ? "flex-col items-center gap-gt-8" : "items-center justify-between"}`}>
        {brand ?? (collapsed ? null : <Wordmark />)}
        <button
          type="button"
          aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-md border-2 border-gt-line bg-gt-surface text-gt-ink-2 transition hover:-translate-y-0.5 hover:border-gt-line-strong hover:text-gt-ink"
        >
          <ChevronLeftIcon className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <ul className="mt-gt-8 flex flex-col gap-gt-8">
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
                className={`flex w-full items-center rounded-gt-lg border-2 font-gt-display text-gt-md font-extrabold transition duration-150 ease-gt-bounce ${
                  collapsed ? "justify-center px-gt-8 py-gt-8" : "gap-gt-10 px-gt-12 py-gt-8"
                } ${
                  isActive
                    ? "border-gt-line-strong bg-gt-primary-soft text-gt-primary shadow-gt-xs"
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

      {collapsed ? null : belowNav ? <div className="mt-gt-12">{belowNav}</div> : null}

      <span className="flex-1" />

      {/* profile block at the bottom */}
      <button
        type="button"
        onClick={onProfile}
        className={`mt-gt-8 flex items-center gap-gt-8 rounded-gt-lg border-2 border-gt-line bg-gt-surface p-gt-8 text-left transition hover:border-gt-line-strong ${collapsed ? "justify-center" : ""}`}
      >
        <AvatarCircle initials={profileName[0]} />
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
  /** replaces the wordmark in the "home" variant. */
  brand?: ReactNode;
  /** trailing action slot before the avatar. */
  actions?: ReactNode;
  /** optional second band under the header row. */
  band?: ReactNode;
  onBack?: () => void;
  onProfile?: () => void;
  avatarInitials?: string;
  /** when set, the top-right shows a bare X instead of the profile avatar. */
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
      <div className="flex items-center gap-gt-8 px-gt-16 pb-gt-2 pt-gt-16">
        {showBack ? (
          <button
            type="button"
            aria-label="Volver"
            onClick={onBack}
            className="grid h-8 w-8 shrink-0 place-items-center text-gt-ink transition hover:-translate-x-0.5"
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
          <button
            type="button"
            aria-label="Cancelar"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center text-gt-ink transition hover:scale-110"
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

// ── Add-transaction FAB — square-plus; tap opens the scan-mode menu ──────
export type ScanMode = "single" | "batch" | "statement";
export type ScanFabPlacement = "corner" | "title";

interface ScanModeMeta {
  id: ScanMode;
  icon: string;
  label: string;
  cost: string;
}

export interface ScanFabProps {
  placement?: ScanFabPlacement;
  modes: ScanModeMeta[];
  onModeSelect?: (mode: ScanMode) => void;
  className?: string;
}

/**
 * The floating "add a transaction" button — square-plus (52×52, rounded-gt-lg,
 * a literal "+"). Tapping opens the scan-mode menu (single / batch / statement).
 */
export function ScanFab({ placement = "corner", modes, onModeSelect, className = "" }: ScanFabProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pos = placement === "corner" ? "fixed bottom-24 right-gt-16 z-40 lg:bottom-gt-24" : "relative";

  return (
    <div className={`${pos} ${className}`}>
      <button
        type="button"
        aria-label="Agregar transacción"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
        className="grid h-13 w-13 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-primary font-gt-display text-gt-4xl font-extrabold leading-none text-white shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30"
      >
        +
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute bottom-full right-0 mb-gt-8 w-60 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-8 shadow-gt-md"
        >
          <p className="px-gt-8 pb-gt-4 pt-gt-2 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Agregar transacción</p>
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onModeSelect?.(m.id);
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

// ── Perfil menu — grouped treatment (DM-41) ─────────────────────────────
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
  items,
  onSelect,
  className = "",
}: {
  name?: string;
  email?: string;
  items: ProfileMenuItem[];
  onSelect?: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={`w-72 overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md ${className}`}>
      <div className="flex items-center gap-gt-10 border-b-2 border-gt-line bg-gt-bg-3 px-gt-12 py-gt-12">
        <AvatarCircle initials={name[0]} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{name}</span>
          <span className="truncate text-gt-xs font-medium text-gt-ink-3">{email}</span>
        </span>
      </div>
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
