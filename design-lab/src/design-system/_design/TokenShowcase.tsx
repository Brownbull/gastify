import { cssVarFor, fontSize, twKeyFor, type SemanticColorKey } from "@shared/design-tokens";

/**
 * Token inspection surfaces (Design System/Tokens stories) for the Playful
 * Geometric single theme (DM-1). Swatch fills read `var(--*)` inline by design
 * so the grid reflects the live cascade; product components never do this —
 * they use the static `gt-*` utility classes (which the chrome here also proves).
 */

const colorEntries = Object.entries(twKeyFor) as Array<
  [Exclude<SemanticColorKey, "shadowColor" | "shadowColorLg">, string]
>;

function Swatch({ tsKey, twKey }: { tsKey: SemanticColorKey; twKey: string }) {
  const cssVar = cssVarFor[tsKey];
  return (
    <div className="flex items-center gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-sm">
      <span
        className="h-10 w-10 shrink-0 rounded-gt-md border-2 border-gt-line-strong"
        style={{ backgroundColor: `var(${cssVar})` }}
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-gt-md font-bold text-gt-ink">{twKey}</span>
        <span className="truncate text-gt-sm text-gt-ink-3">
          {cssVar} · bg-gt-{twKey}
        </span>
      </span>
    </div>
  );
}

export function ColorTokenGrid() {
  return (
    <section className="bg-gt-bg p-gt-24">
      <h2 className="mb-gt-4 font-gt-display text-gt-2xl font-extrabold text-gt-primary">Semantic colors</h2>
      <p className="mb-gt-16 text-gt-md text-gt-ink-2">
        Playful Geometric — single theme. Violet primary, amber/pink/emerald accents, cream canvas, slate-900 ink.
      </p>
      <div className="grid grid-cols-1 gap-gt-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {colorEntries.map(([tsKey, twKey]) => (
          <Swatch key={tsKey} tsKey={tsKey} twKey={twKey} />
        ))}
      </div>
    </section>
  );
}

const accentBlocks = [
  ["bg-gt-primary", "primary"],
  ["bg-gt-secondary", "secondary"],
  ["bg-gt-accent", "accent"],
  ["bg-gt-success", "success"],
  ["bg-gt-chart-5", "info"],
  ["bg-gt-error", "danger"],
];

/** The geometric grammar in one card: ink border + hard shadow + accent blocks. */
export function GeometricGrammar() {
  return (
    <section className="bg-gt-bg p-gt-24">
      <h2 className="mb-gt-4 font-gt-display text-gt-2xl font-extrabold text-gt-primary">Geometric grammar</h2>
      <p className="mb-gt-16 text-gt-md text-gt-ink-2">
        2–3px ink borders · hard zero-blur offset shadows · bold type · accent blocks.
      </p>
      <div className="max-w-md rounded-gt-4xl border-[3px] border-gt-line-strong bg-gt-surface p-gt-20 shadow-gt-2xl">
        <p className="font-gt-display text-gt-xl font-extrabold text-gt-ink">gastify</p>
        <p className="mb-gt-12 text-gt-sm text-gt-ink-3">Supermercado Líder · hoy</p>
        <p className="mb-gt-12 font-gt-display text-gt-5xl font-extrabold text-gt-ink">$45.990</p>
        <div className="mb-gt-16 grid grid-cols-3 gap-gt-8">
          {accentBlocks.map(([cls, label]) => (
            <div
              key={label}
              className={`flex h-12 items-end rounded-gt-2xl border-2 border-gt-line-strong p-gt-6 shadow-gt-sm ${cls}`}
            >
              <span className="text-gt-xs font-bold text-white">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-gt-8">
          <button
            type="button"
            className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary px-gt-16 py-gt-8 text-gt-md font-extrabold text-white shadow-gt-sm"
          >
            Guardar
          </button>
          <button
            type="button"
            className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-8 text-gt-md font-extrabold text-gt-ink shadow-gt-sm"
          >
            Editar
          </button>
        </div>
      </div>
    </section>
  );
}

const sizeClass: Record<keyof typeof fontSize, string> = {
  xs: "text-gt-xs",
  sm: "text-gt-sm",
  base: "text-gt-base",
  md: "text-gt-md",
  lg: "text-gt-lg",
  xl: "text-gt-xl",
  "2xl": "text-gt-2xl",
  "3xl": "text-gt-3xl",
  "4xl": "text-gt-4xl",
  "5xl": "text-gt-5xl",
  "6xl": "text-gt-6xl",
  "7xl": "text-gt-7xl",
};

export function TypographySpecimen() {
  return (
    <section className="bg-gt-bg p-gt-24">
      <h2 className="mb-gt-16 font-gt-display text-gt-2xl font-extrabold text-gt-primary">Typography</h2>
      <div className="mb-gt-24 grid gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-20 shadow-gt-md">
        <p className="font-gt-display text-gt-4xl font-extrabold text-gt-primary">gastify — Baloo 2 (wordmark)</p>
        <p className="font-gt-body text-gt-xl font-bold text-gt-ink">Outfit — cuerpo de la interfaz. Escanea tu boleta.</p>
        <p className="font-gt-alt text-gt-xl text-gt-ink-2">Space Grotesk — alternate face.</p>
      </div>
      <div className="grid gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-20 shadow-gt-md">
        {(Object.entries(fontSize) as Array<[keyof typeof fontSize, number]>).map(([k, px]) => (
          <div key={k} className="flex items-baseline gap-gt-16 border-b border-gt-line pb-gt-8 last:border-b-0">
            <span className="w-24 shrink-0 text-gt-sm text-gt-ink-3">
              {k} · {px}px
            </span>
            <span className={`${sizeClass[k]} font-bold text-gt-ink`}>$45.990 en Supermercado</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const radiusClasses: Array<[string, string]> = [
  ["sm", "rounded-gt-sm"],
  ["md", "rounded-gt-md"],
  ["lg", "rounded-gt-lg"],
  ["xl", "rounded-gt-xl"],
  ["2xl", "rounded-gt-2xl"],
  ["3xl", "rounded-gt-3xl"],
  ["4xl", "rounded-gt-4xl"],
  ["6xl", "rounded-gt-6xl"],
  ["pill", "rounded-gt-pill"],
];

const shadowClasses: Array<[string, string]> = [
  ["xs", "shadow-gt-xs"],
  ["sm", "shadow-gt-sm"],
  ["md", "shadow-gt-md"],
  ["lg", "shadow-gt-lg"],
  ["xl", "shadow-gt-xl"],
  ["2xl", "shadow-gt-2xl"],
];

export function ShapeAndElevation() {
  return (
    <section className="bg-gt-bg p-gt-24">
      <h2 className="mb-gt-16 font-gt-display text-gt-2xl font-extrabold text-gt-primary">Radii & hard shadows</h2>
      <div className="mb-gt-24 flex flex-wrap gap-gt-16">
        {radiusClasses.map(([k, cls]) => (
          <div key={k} className="flex flex-col items-center gap-gt-8">
            <span className={`h-16 w-16 border-2 border-gt-line-strong bg-gt-primary-soft ${cls}`} />
            <span className="text-gt-sm text-gt-ink-3">{k}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-gt-24">
        {shadowClasses.map(([k, cls]) => (
          <div key={k} className="flex flex-col items-center gap-gt-8">
            <span className={`h-20 w-28 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface ${cls}`} />
            <span className="text-gt-sm text-gt-ink-3">{k}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
