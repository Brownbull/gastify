// Atoms/Colors — design-token showcase. Not a React component; purely a
// visual reference for the theme palette migrated from index.html into
// frontend/src/styles/global.css (Phase 1 of the Ladle pivot).

import type { Story } from '@ladle/react';

export default {
  title: 'Atoms/Colors',
};

interface SwatchProps {
  name: string;
  token: string;
}

const Swatch = ({ name, token }: SwatchProps) => (
  <div className="flex items-center gap-3">
    <div
      className="w-12 h-12 rounded-md border flex-shrink-0"
      style={{ background: `var(--${token})`, borderColor: 'var(--border-medium)' }}
    />
    <div className="min-w-0">
      <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
        {name}
      </div>
      <code className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        --{token}
      </code>
    </div>
  </div>
);

interface SectionProps {
  title: string;
  swatches: SwatchProps[];
}

const Section = ({ title, swatches }: SectionProps) => (
  <section className="mb-8">
    <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
      {title}
    </h2>
    <div className="grid grid-cols-2 gap-3">
      {swatches.map((s) => (
        <Swatch key={s.token} {...s} />
      ))}
    </div>
  </section>
);

export const Palette: Story = () => (
  <div className="p-6 max-w-2xl">
    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
      Color Tokens — Palette
    </h1>
    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
      Toggle <strong>mode</strong> in the Ladle controls (top right) to flip light/dark.
      Theme switcher (normal / professional / mono) is forthcoming in Phase 3.5 — for now
      the Provider pins to <code>data-theme="normal"</code>.
    </p>

    <Section
      title="Surfaces"
      swatches={[
        { name: 'Background', token: 'bg' },
        { name: 'Background secondary', token: 'bg-secondary' },
        { name: 'Background tertiary', token: 'bg-tertiary' },
        { name: 'Surface', token: 'surface' },
      ]}
    />

    <Section
      title="Brand"
      swatches={[
        { name: 'Primary', token: 'primary' },
        { name: 'Primary hover', token: 'primary-hover' },
        { name: 'Primary light', token: 'primary-light' },
        { name: 'Secondary', token: 'secondary' },
        { name: 'Accent', token: 'accent' },
      ]}
    />

    <Section
      title="Status"
      swatches={[
        { name: 'Success', token: 'success' },
        { name: 'Warning', token: 'warning' },
        { name: 'Error', token: 'error' },
      ]}
    />

    <Section
      title="Text"
      swatches={[
        { name: 'Text primary', token: 'text-primary' },
        { name: 'Text secondary', token: 'text-secondary' },
        { name: 'Text tertiary', token: 'text-tertiary' },
      ]}
    />

    <Section
      title="Borders"
      swatches={[
        { name: 'Border light', token: 'border-light' },
        { name: 'Border medium', token: 'border-medium' },
      ]}
    />

    <Section
      title="Chart"
      swatches={[
        { name: 'Chart 1', token: 'chart-1' },
        { name: 'Chart 2', token: 'chart-2' },
        { name: 'Chart 3', token: 'chart-3' },
        { name: 'Chart 4', token: 'chart-4' },
        { name: 'Chart 5', token: 'chart-5' },
        { name: 'Chart 6', token: 'chart-6' },
      ]}
    />
  </div>
);

const SEMANTIC_GROUPS = [
  { name: 'Positive (spending down — good)', prefix: 'positive' },
  { name: 'Negative (spending up — bad)', prefix: 'negative' },
  { name: 'Neutral (no change)', prefix: 'neutral' },
];

export const Semantic: Story = () => (
  <div className="p-6 max-w-2xl">
    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
      Color Tokens — Semantic
    </h1>
    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
      Spending direction + change indicators. Each group has primary / secondary / bg / border.
    </p>

    {SEMANTIC_GROUPS.map(({ name, prefix }) => (
      <Section
        key={prefix}
        title={name}
        swatches={[
          { name: 'primary', token: `${prefix}-primary` },
          { name: 'secondary', token: `${prefix}-secondary` },
          { name: 'bg', token: `${prefix}-bg` },
          { name: 'border', token: `${prefix}-border` },
        ]}
      />
    ))}

    <Section
      title="Warning (approaching limits)"
      swatches={[
        { name: 'semantic', token: 'warning-semantic' },
        { name: 'secondary', token: 'warning-secondary' },
        { name: 'bg', token: 'warning-bg' },
        { name: 'border', token: 'warning-border' },
      ]}
    />
  </div>
);

const INSIGHT_TYPES = [
  { label: 'Quirky', slug: 'quirky' },
  { label: 'Celebration', slug: 'celebration' },
  { label: 'Actionable', slug: 'actionable' },
  { label: 'Tradeoff', slug: 'tradeoff' },
  { label: 'Trend', slug: 'trend' },
];

export const Insights: Story = () => (
  <div className="p-6 max-w-2xl">
    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
      Color Tokens — Insights
    </h1>
    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
      Each insight type pairs a tinted background with an icon color. Used by InsightsView.
    </p>

    {INSIGHT_TYPES.map(({ label, slug }) => (
      <section key={slug} className="mb-4">
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {label}
        </h2>
        <div
          className="flex items-center gap-4 p-4 rounded-lg"
          style={{ background: `var(--insight-${slug}-bg)` }}
        >
          <div
            className="w-12 h-12 rounded-md flex-shrink-0"
            style={{ background: `var(--insight-${slug}-icon)` }}
          />
          <div>
            <code className="text-xs block" style={{ color: 'var(--text-secondary)' }}>
              --insight-{slug}-bg
            </code>
            <code className="text-xs block" style={{ color: 'var(--text-secondary)' }}>
              --insight-{slug}-icon
            </code>
          </div>
        </div>
      </section>
    ))}
  </div>
);
