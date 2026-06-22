/* ARCHIVED 2026-06-16 (DM-1): Geometría reference-render component for the CHOSEN
   style direction. The real geometric atoms/molecules/organisms/screens have since
   landed (Phases 5–8), so this reference is retired. Excluded from the glob via its
   archived story (*.archive.tsx). */
import type { CSSProperties, ReactNode } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { sampleHome } from "../../model/HomeScreenModel";

/**
 * SPIKE — Style Option B · "Geometría Gustify" (Playful Geometric port).
 *
 * Geometry lifted 1:1 from Gustify's design-system organisms
 * (apps/web/src/design-system/organisms/AppShell.tsx):
 * frame = 390px, 3px fg border, 40px radius, 16px gutter, 44px top inset,
 * 26×148 notch; header actions = h-10 w-10 rounded-12 border-2 + hard shadow;
 * bottom nav = border-t-3, full-bleed, tiles rounded-16 border-2, ACTIVE =
 * amber fill; everything font-extrabold; hard zero-blur offset shadows.
 *
 * TOKEN EXCEPTION (documented per STORYBOOK-STRUCTURE.md rule 7): hex
 * constants are Gustify's locked palette under evaluation — promoted into
 * shared/design-tokens.ts as a theme if this direction wins.
 * Decision surface only — archived on selection.
 */

const G = {
  cream: "#FFFDF5",
  fg: "#1E293B",
  fgMuted: "#64748B",
  borderSoft: "#E2E8F0",
  surfaceMuted: "#F1F5F9",
  violet: "#8B5CF6",
  pink: "#F472B6",
  amber: "#FBBF24",
  emerald: "#34D399",
  blue: "#3B82F6",
  red: "#EF4444",
  white: "#FFFFFF",
} as const;

const hard = (px: number): string => `${px}px ${px}px 0px 0px ${G.fg}`;

const card: CSSProperties = {
  backgroundColor: G.white,
  border: `2px solid ${G.fg}`,
  borderRadius: 20,
  boxShadow: hard(5),
};

/** Gustify AppSurface mobile frame, spike-local. */
function GeoSurface({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative mx-auto flex min-h-[844px] w-[390px] flex-col overflow-hidden"
      style={{
        backgroundColor: G.cream,
        border: `3px solid ${G.fg}`,
        borderRadius: 40,
        boxShadow: hard(8),
        padding: 16,
        paddingTop: 44,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-[26px] w-[148px] -translate-x-1/2"
        style={{ backgroundColor: G.fg, borderRadius: "0 0 20px 20px" }}
      />
      {children}
    </div>
  );
}

function ActionTile({
  bg,
  border = G.fg,
  shadow = true,
  label,
  children,
}: {
  bg: string;
  border?: string;
  shadow?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-10 w-10 shrink-0 place-items-center"
      style={{
        backgroundColor: bg,
        border: `2px solid ${border}`,
        borderRadius: 12,
        boxShadow: shadow ? hard(2) : undefined,
      }}
    >
      {children}
    </button>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span
        className="grid h-8 w-8 place-items-center"
        style={{ backgroundColor: G.cream, border: `2px solid ${G.fg}`, borderRadius: 10 }}
      >
        <PixelIcon name={icon} size={18} />
      </span>
      <h3 className="text-[18px] font-extrabold leading-none" style={{ color: G.fg }}>
        {children}
      </h3>
    </div>
  );
}

function GBadge({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 text-[12px] font-extrabold leading-none"
      style={{ backgroundColor: bg, color: G.fg, border: `2px solid ${G.fg}`, borderRadius: 999, boxShadow: hard(2) }}
    >
      {children}
    </span>
  );
}

const rubroIconFor: Record<string, string> = {
  Supermercado: "rubro-supermercados",
  Transporte: "rubro-transporte-vehiculo",
  Restaurantes: "rubro-restaurantes",
  Salud: "rubro-salud-bienestar",
  Hogar: "rubro-vivienda",
  Otros: "rubro-otros",
};

const blockAccent = [G.violet, G.amber, G.pink, G.emerald, G.blue, G.fgMuted];

function GeoTreemap() {
  return (
    <section className="p-4" style={card}>
      <SectionTitle icon="fin-budget">Este Mes</SectionTitle>
      <div className="grid grid-cols-4 grid-rows-3 gap-2" style={{ height: "216px" }}>
        {sampleHome.treemap.map((b, i) => {
          const big = i === 0;
          return (
            <div
              key={b.label}
              className={`flex flex-col justify-between overflow-hidden p-2.5 ${b.spanClass}`}
              style={{
                backgroundColor: blockAccent[i % blockAccent.length],
                border: `2px solid ${G.fg}`,
                borderRadius: 14,
                boxShadow: hard(2),
              }}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="grid shrink-0 place-items-center"
                  style={{
                    backgroundColor: G.white,
                    border: `2px solid ${G.fg}`,
                    borderRadius: 999,
                    width: big ? 30 : 24,
                    height: big ? 30 : 24,
                  }}
                >
                  <PixelIcon name={rubroIconFor[b.label] ?? "rubro-otros"} size={big ? 18 : 14} />
                </span>
                <span className="truncate text-[12px] font-extrabold" style={{ color: G.white }}>
                  {b.label}
                </span>
              </div>
              <span className={`${big ? "text-[20px]" : "text-[15px]"} font-extrabold leading-none`} style={{ color: G.white }}>
                {b.amount}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const storeIconFor = (merchant: string) =>
  merchant.includes("Líder")
    ? "store-supermarket"
    : merchant.includes("Copec")
      ? "store-gas-station"
      : merchant.includes("Farmacia")
        ? "store-pharmacy"
        : "store-other";

function GeoRecent() {
  return (
    <section className="p-4" style={card}>
      <div className="flex items-center justify-between">
        <SectionTitle icon="fin-receipt">Recientes</SectionTitle>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="mb-3 text-[13px] font-extrabold"
          style={{ color: G.violet }}
        >
          Ver todo →
        </a>
      </div>
      <ul className="flex flex-col">
        {sampleHome.recent.map((t, i) => (
          <li
            key={t.merchant}
            className="flex items-center gap-3 py-3"
            style={i < sampleHome.recent.length - 1 ? { borderBottom: `2px solid ${G.borderSoft}` } : undefined}
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center"
              style={{ backgroundColor: G.surfaceMuted, border: `2px solid ${G.fg}`, borderRadius: 12, boxShadow: hard(2) }}
            >
              <PixelIcon name={storeIconFor(t.merchant)} size={26} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-extrabold leading-tight" style={{ color: G.fg }}>
                {t.merchant}
              </span>
              <span className="text-[12px] font-bold leading-none" style={{ color: G.fgMuted }}>
                {t.items} ítems · {t.date}
              </span>
            </span>
            {t.badge ? <GBadge bg={G.amber}>{t.badge.label}</GBadge> : null}
            <span className="text-[15px] font-extrabold" style={{ color: G.fg }}>
              {t.amount}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const geoTabs = [
  { key: "inicio", label: "Inicio", icon: "nav-home" },
  { key: "compras", label: "Compras", icon: "fin-receipt" },
  { key: "escanear", label: "Escanear", icon: "scan-receipt" },
  { key: "gastos", label: "Gastos", icon: "chart-pie" },
  { key: "perfil", label: "Perfil", icon: "nav-profile" },
];

/** Gustify BottomNav recipe: full-bleed, border-t-3, amber filled active tile. */
function GeoBottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="-mx-4 -mb-4 mt-auto grid grid-cols-5 gap-1 px-1.5 pb-1 pt-1.5"
      style={{ backgroundColor: G.white, borderTop: `3px solid ${G.fg}` }}
    >
      {geoTabs.map((tab) => {
        const isActive = tab.key === "inicio";
        return (
          <a
            key={tab.key}
            href="#"
            aria-current={isActive ? "page" : undefined}
            onClick={(e) => e.preventDefault()}
            className="relative flex min-w-0 flex-col items-center gap-1 px-1 pb-1.5 pt-2 text-[10px] font-extrabold"
            style={{
              color: isActive ? G.fg : G.fgMuted,
              backgroundColor: isActive ? G.amber : "transparent",
              border: `2px solid ${isActive ? G.fg : "transparent"}`,
              borderRadius: 16,
              boxShadow: isActive ? hard(2) : undefined,
            }}
          >
            <PixelIcon name={tab.icon} size={24} />
            <span className="truncate leading-tight">{tab.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export function GustifyGeometricHome() {
  return (
    <GeoSurface>
      <header className="flex items-center gap-2 pb-4 pt-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: G.fgMuted }}>
            Junio 2026
          </div>
          <h1 className="text-[24px] font-extrabold leading-tight" style={{ color: G.fg }}>
            Inicio
          </h1>
        </div>
        <ActionTile bg={G.violet} label="Escanear boleta">
          <PixelIcon name="scan-receipt" size={22} />
        </ActionTile>
        <ActionTile bg={G.white} border={G.borderSoft} shadow={false} label="Notificaciones">
          <PixelIcon name="nav-alerts" size={20} />
        </ActionTile>
        <button
          type="button"
          aria-label="Perfil"
          className="grid h-10 w-10 shrink-0 place-items-center text-[14px] font-extrabold leading-none"
          style={{
            backgroundColor: G.pink,
            border: `2px solid ${G.fg}`,
            borderRadius: 999,
            boxShadow: hard(2),
            color: G.white,
          }}
        >
          B
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
        <div>
          <p className="text-[14px] font-bold" style={{ color: G.fgMuted }}>
            {sampleHome.greeting}
          </p>
          <p className="text-[44px] font-extrabold leading-[1.1] tracking-tight" style={{ color: G.fg }}>
            {sampleHome.total}
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <GBadge bg={G.emerald}>−12% vs mayo</GBadge>
            <span className="text-[12px] font-bold" style={{ color: G.fgMuted }}>
              {sampleHome.monthLabel}
            </span>
          </div>
        </div>
        <GeoTreemap />
        <GeoRecent />
      </main>

      <GeoBottomNav />
    </GeoSurface>
  );
}
