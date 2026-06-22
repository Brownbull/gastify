import type { ReactNode } from "react";
import {
  BarChartIcon,
  BellIcon,
  CameraIcon,
  FileTextIcon,
  HomeIcon,
  LayersIcon,
  ListIcon,
  PieChartIcon,
  ReceiptIcon,
  SettingsIcon,
  TagIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
  XIcon,
  type IconProps,
} from "../assets/icons";

/**
 * App shell pieces — Gustify AppShell pattern, gastify-themed. Every piece is
 * presentational-by-default (showcase mode); live-app behavior arrives later
 * via opt-in props, never by changing showcase defaults.
 *
 * NAV CATALOGS: the IA decision (PLAN-MOCKUPS Phase 3) is OPEN. Both catalogs
 * live here until the user picks; the loser is then removed and the winner
 * becomes the single `getMainNavItems` source.
 */

export type IconComponent = (p: IconProps) => ReactNode;

export interface NavItem {
  key: string;
  label: string;
  icon: IconComponent;
}

/** Candidate A — the 11-entry navigation web/ ships today (AppLayout). */
export const currentNavCatalog: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: HomeIcon },
  { key: "scan", label: "Escanear", icon: CameraIcon },
  { key: "scan-batch", label: "Escaneo por lote", icon: LayersIcon },
  { key: "statements", label: "Estados de cuenta", icon: FileTextIcon },
  { key: "transactions", label: "Transacciones", icon: ListIcon },
  { key: "items", label: "Ítems", icon: TagIcon },
  { key: "trends", label: "Tendencias", icon: TrendingUpIcon },
  { key: "reports", label: "Reportes", icon: BarChartIcon },
  { key: "notifications", label: "Notificaciones", icon: BellIcon },
  { key: "groups", label: "Grupos", icon: UsersIcon },
  { key: "settings", label: "Ajustes", icon: SettingsIcon },
];

/** Candidate B — the 5-tab IA locked in legacy BoletApp's 2026-03 mockup HANDOFF. */
export const redesignedNavCatalog: NavItem[] = [
  { key: "inicio", label: "Inicio", icon: HomeIcon },
  { key: "compras", label: "Compras", icon: ReceiptIcon },
  { key: "escanear", label: "Escanear", icon: CameraIcon },
  { key: "gastos", label: "Gastos", icon: PieChartIcon },
  { key: "perfil", label: "Perfil", icon: UserIcon },
];

export function Wordmark() {
  return <span className="font-gt-display text-gt-2xl text-gt-primary">gastify</span>;
}

export function ProfileButton({ label = "Perfil" }: { label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-gt-pill bg-gt-primary-soft text-gt-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gt-primary"
    >
      <UserIcon className="h-4 w-4" />
    </button>
  );
}

/** Mobile/tablet top bar — wordmark plus leading/trailing action slots. */
export function AppHeader({ leading, trailing }: { leading?: ReactNode; trailing?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-gt-12 border-b border-gt-line bg-gt-surface px-gt-16">
      {leading}
      <Wordmark />
      <span className="flex-1" />
      {trailing}
    </header>
  );
}

/** Desktop sidebar navigation. */
export function SideNav({ items, active, footer }: { items: NavItem[]; active: string; footer?: ReactNode }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="flex w-60 shrink-0 flex-col border-r border-gt-line bg-gt-surface p-gt-12"
    >
      <div className="px-gt-8 py-gt-12">
        <Wordmark />
      </div>
      <ul className="flex flex-1 flex-col gap-gt-2">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key}>
              <a
                href="#"
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => e.preventDefault()}
                className={`flex items-center gap-gt-12 rounded-gt-lg px-gt-12 py-gt-8 text-gt-md transition-colors duration-150 ease-gt-out ${
                  isActive
                    ? "bg-gt-primary-soft font-semibold text-gt-primary"
                    : "text-gt-ink-2 hover:bg-gt-bg-3 hover:text-gt-ink"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
      {footer}
    </nav>
  );
}

/** Mobile bottom tab bar — column count follows the item count. */
export function BottomNav({ items, active }: { items: NavItem[]; active: string }) {
  return (
    <nav
      aria-label="Navegación principal"
      className="grid shrink-0 border-t border-gt-line bg-gt-surface px-gt-4 pb-gt-8 pt-gt-4"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        const isScan = item.key === "escanear";
        return (
          <a
            key={item.key}
            href="#"
            aria-current={isActive ? "page" : undefined}
            onClick={(e) => e.preventDefault()}
            className={`flex flex-col items-center gap-gt-4 rounded-gt-lg py-gt-6 text-gt-xs ${
              isActive ? "font-semibold text-gt-primary" : "text-gt-ink-3"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-gt-xl ${
                isScan ? "bg-gt-primary text-white" : isActive ? "bg-gt-primary-soft" : ""
              }`}
            >
              <item.icon className="h-5 w-5" />
            </span>
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

/** Mobile navigation drawer (modal overlay over the app frame). */
export function NavDrawer({
  items,
  active,
  onClose,
}: {
  items: NavItem[];
  active: string;
  onClose?: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Menú de navegación" className="absolute inset-0 z-10 flex">
      <div className="flex w-72 flex-col overflow-y-auto bg-gt-surface p-gt-12 shadow-gt-2xl">
        <div className="flex items-center justify-between px-gt-8 py-gt-12">
          <Wordmark />
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-gt-lg text-gt-ink-2 hover:bg-gt-bg-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gt-primary"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label="Navegación principal" className="flex flex-col gap-gt-2">
          {items.map((item) => {
            const isActive = item.key === active;
            return (
              <a
                key={item.key}
                href="#"
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => e.preventDefault()}
                className={`flex items-center gap-gt-12 rounded-gt-lg px-gt-12 py-gt-10 text-gt-md ${
                  isActive ? "bg-gt-primary-soft font-semibold text-gt-primary" : "text-gt-ink-2"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
      <div aria-hidden="true" className="flex-1 bg-gt-ink/40" onClick={onClose} />
    </div>
  );
}
