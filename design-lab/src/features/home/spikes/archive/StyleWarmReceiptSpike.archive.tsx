/* ARCHIVED 2026-06-10 (DM-1): Boleta Cálida — the NOT-chosen style direction. Kept for
   provenance; excluded from the Storybook glob (*.archive.tsx). Renders in the new
   Playful Geometric palette now, not its original warm tints. */
import { Badge } from "@design-system/atoms/Badge";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { AppSurface } from "@design-system/organisms/AppSurface";
import { sampleHome } from "../../model/HomeScreenModel";

/**
 * SPIKE — Style Option A · "Boleta Cálida" (Claude's own direction).
 *
 * Thesis: lean INTO what gastify already owns — the warm Ni No Kuni token
 * palette, the PixelLab icon language, and the boleta (printed receipt) as a
 * physical metaphor. Soft paper surfaces (NOT hard geometry — that's option
 * B's identity), committed category tints, Baloo 2 display numerals, pixel
 * icons carrying every meaning, the scan tab as hero action.
 *
 * Polish pass 2 (2026-06-10): scaled type up (44px hero, 16-18px rows),
 * generous spacing (20px gutters, gap-5 sections), stronger tints (/25 +
 * line-strong borders), bigger icon tiles. Token discipline: all gt-*.
 * Decision surface only — archived on selection.
 */

const rubroIconFor: Record<string, string> = {
  Supermercado: "rubro-supermercados",
  Transporte: "rubro-transporte-vehiculo",
  Restaurantes: "rubro-restaurantes",
  Salud: "rubro-salud-bienestar",
  Hogar: "rubro-vivienda",
  Otros: "rubro-otros",
};

const storeIconFor = (merchant: string) =>
  merchant.includes("Líder")
    ? "store-supermarket"
    : merchant.includes("Copec")
      ? "store-gas-station"
      : merchant.includes("Farmacia")
        ? "store-pharmacy"
        : "store-other";

const tintFor = [
  "bg-gt-chart-1/25",
  "bg-gt-chart-2/25",
  "bg-gt-chart-3/25",
  "bg-gt-chart-5/25",
  "bg-gt-chart-6/30",
  "bg-gt-neutral-bg",
];

function SectionTitle({ icon, children, trailing }: { icon: string; children: string; trailing?: React.ReactNode }) {
  return (
    <div className="mb-4 flex w-full items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-gt-pill border border-gt-line bg-gt-bg shadow-gt-sm">
        <PixelIcon name={icon} size={22} />
      </span>
      <h3 className="text-gt-xl font-bold text-gt-ink">{children}</h3>
      <span className="flex-1" />
      {trailing}
    </div>
  );
}

function WarmTreemap() {
  return (
    <section className="rounded-gt-4xl border border-gt-line bg-gt-surface p-5 shadow-gt-md">
      <SectionTitle icon="fin-budget">Este Mes</SectionTitle>
      <div className="grid grid-cols-4 grid-rows-3 gap-2" style={{ height: "216px" }}>
        {sampleHome.treemap.map((b, i) => {
          const big = i === 0;
          return (
            <div
              key={b.label}
              className={`flex flex-col justify-between overflow-hidden rounded-gt-2xl border border-gt-line-strong p-2.5 ${tintFor[i % tintFor.length]} ${b.spanClass}`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={`flex shrink-0 items-center justify-center rounded-gt-pill border border-gt-line bg-gt-surface ${big ? "h-8 w-8" : "h-6 w-6"}`}
                >
                  <PixelIcon name={rubroIconFor[b.label] ?? "rubro-otros"} size={big ? 20 : 14} />
                </span>
                <span className="truncate text-gt-sm font-semibold text-gt-ink">{b.label}</span>
              </div>
              <span className={`font-gt-display ${big ? "text-gt-3xl" : "text-gt-lg"} leading-none text-gt-ink`}>
                {b.amount}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReceiptList() {
  return (
    <section className="relative rounded-gt-2xl border border-gt-line bg-gt-surface shadow-gt-md">
      {/* perforation notches — torn-receipt metaphor */}
      <span aria-hidden="true" className="absolute -left-2.5 top-[60px] h-5 w-5 rounded-gt-pill border-r border-gt-line bg-gt-bg" />
      <span aria-hidden="true" className="absolute -right-2.5 top-[60px] h-5 w-5 rounded-gt-pill border-l border-gt-line bg-gt-bg" />
      <header className="flex items-center px-5 pb-3 pt-5">
        <SectionTitle
          icon="fin-receipt"
          trailing={
            <a href="#" onClick={(e) => e.preventDefault()} className="text-gt-md font-semibold text-gt-primary">
              Ver todo →
            </a>
          }
        >
          RECIENTES
        </SectionTitle>
      </header>
      <div className="mx-5 -mt-4 border-t-2 border-dashed border-gt-line" />
      <ul className="flex flex-col px-5 py-1.5">
        {sampleHome.recent.map((t) => (
          <li
            key={t.merchant}
            className="flex items-center gap-3.5 border-b border-dashed border-gt-line py-3.5 last:border-b-0"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-gt-2xl border border-gt-line-strong bg-gt-bg">
              <PixelIcon name={storeIconFor(t.merchant)} size={28} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-gt-lg font-semibold leading-tight text-gt-ink">{t.merchant}</span>
              <span className="text-gt-sm leading-none text-gt-ink-3">{t.items} ítems · {t.date}</span>
            </span>
            {t.badge ? <Badge tone={t.badge.tone}>{t.badge.label}</Badge> : null}
            <span className="font-gt-display text-gt-xl text-gt-ink">{t.amount}</span>
          </li>
        ))}
      </ul>
      <footer className="px-5 pb-4 pt-1">
        <p className="text-center text-gt-xs tracking-[0.16em] text-gt-ink-3">· · · gracias por tu compra · · ·</p>
      </footer>
    </section>
  );
}

const warmTabs = [
  { key: "inicio", label: "Inicio", icon: "nav-home" },
  { key: "compras", label: "Compras", icon: "fin-receipt" },
  { key: "escanear", label: "Escanear", icon: "scan-receipt" },
  { key: "gastos", label: "Gastos", icon: "chart-pie" },
  { key: "perfil", label: "Perfil", icon: "nav-profile" },
];

function WarmBottomNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="grid grid-cols-5 items-end border-t border-gt-line bg-gt-surface px-2 pb-3 pt-1.5"
    >
      {warmTabs.map((tab) => {
        const isActive = tab.key === "inicio";
        const isScan = tab.key === "escanear";
        if (isScan) {
          return (
            <a
              key={tab.key}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex flex-col items-center gap-1 text-gt-sm font-semibold text-gt-primary"
            >
              <span className="-mt-9 flex h-16 w-16 items-center justify-center rounded-gt-pill border-4 border-gt-surface bg-gt-primary shadow-gt-xl">
                <PixelIcon name={tab.icon} size={32} />
              </span>
              {tab.label}
            </a>
          );
        }
        return (
          <a
            key={tab.key}
            href="#"
            aria-current={isActive ? "page" : undefined}
            onClick={(e) => e.preventDefault()}
            className={`flex flex-col items-center gap-1 py-1 text-gt-sm ${isActive ? "font-semibold text-gt-primary" : "text-gt-ink-3"}`}
          >
            <span className={`flex h-9 w-12 items-center justify-center rounded-gt-pill ${isActive ? "bg-gt-primary-soft" : ""}`}>
              <PixelIcon name={tab.icon} size={24} />
            </span>
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}

export function WarmReceiptHome() {
  return (
    <AppSurface platform="mobile">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gt-line bg-gt-surface px-5">
        <PixelIcon name="snowshoe-face-wave" size={32} alt="Mascota gastify" />
        <span className="font-gt-display text-gt-3xl text-gt-primary">gastify</span>
        <span className="flex-1" />
        <span className="flex h-10 w-10 items-center justify-center rounded-gt-pill border border-gt-line bg-gt-bg">
          <PixelIcon name="nav-alerts" size={22} alt="Notificaciones" />
        </span>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-gt-xs font-semibold uppercase tracking-[0.12em] text-gt-ink-3">
                {sampleHome.monthLabel}
              </p>
              <p className="text-gt-lg text-gt-ink-2">{sampleHome.greeting}</p>
              <p className="font-gt-display text-[46px] leading-[1.1] text-gt-ink">{sampleHome.total}</p>
              <div className="mt-1.5">
                {sampleHome.delta ? <Badge tone={sampleHome.delta.tone}>{sampleHome.delta.label}</Badge> : null}
              </div>
            </div>
            <PixelIcon name="piggy-coins-stack" size={64} alt="Alcancía" className="mb-1" />
          </div>
          <WarmTreemap />
          <ReceiptList />
        </div>
      </main>
      <WarmBottomNav />
    </AppSurface>
  );
}
