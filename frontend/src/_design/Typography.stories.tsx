// Atoms/Typography — design-token showcase. Visual reference for the font
// families + size scale defined in frontend/src/styles/global.css.

import type { Meta, StoryFn } from '@storybook/react-vite';

const meta: Meta = {
  title: 'Atoms/Typography',
};

export default meta;

const SAMPLE = 'The quick brown fox jumps over the lazy dog';

const SIZES = [
  { token: 'xs', value: '0.75rem (12px)' },
  { token: 'sm', value: '0.875rem (14px)' },
  { token: 'base', value: '1rem (16px)' },
  { token: 'lg', value: '1.125rem (18px)' },
  { token: 'xl', value: '1.25rem (20px)' },
  { token: '2xl', value: '1.5rem (24px)' },
  { token: '3xl', value: '1.875rem (30px)' },
];

export const FontSizes: StoryFn =() => (
  <div className="p-6 max-w-2xl space-y-3">
    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
      Font Sizes
    </h1>
    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
      Default scale. <code>data-font-size="normal"</code> on <code>:root</code> bumps each size
      up by ~1 step (see global.css line 51-69).
    </p>
    {SIZES.map(({ token, value }) => (
      <div
        key={token}
        className="flex items-baseline gap-4 border-b pb-2"
        style={{ borderColor: 'var(--border-light)' }}
      >
        <code className="w-20 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          text-{token}
        </code>
        <code className="w-32 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {value}
        </code>
        <span
          style={{ fontSize: `var(--font-size-${token})`, color: 'var(--text-primary)' }}
        >
          {SAMPLE}
        </span>
      </div>
    ))}
  </div>
);

export const FontFamilies: StoryFn =() => (
  <div className="p-6 max-w-2xl space-y-6">
    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
      Font Families
    </h1>
    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
      Three families. <code>data-font</code> on <code>:root</code> swaps Outfit ↔ Space Grotesk
      for the primary UI font (see global.css line 28-34).
    </p>

    <div>
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
        Outfit (default UI)
      </h2>
      <p
        className="text-xl"
        style={{
          fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif',
          color: 'var(--text-primary)',
        }}
      >
        {SAMPLE}
      </p>
    </div>

    <div>
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
        Space Grotesk (alternate UI — set via <code>data-font="space"</code>)
      </h2>
      <p
        className="text-xl"
        style={{
          fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
          color: 'var(--text-primary)',
        }}
      >
        {SAMPLE}
      </p>
    </div>

    <div>
      <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
        Baloo 2 (wordmark only — Gastify logo, used by TopHeader at weight 700)
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-family-wordmark, "Baloo 2", cursive)',
          fontWeight: 700,
          fontSize: '28px',
          color: 'var(--text-primary)',
        }}
      >
        Gastify
      </p>
    </div>
  </div>
);

export const FontWeights: StoryFn =() => (
  <div className="p-6 max-w-2xl space-y-3">
    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
      Font Weights (Outfit)
    </h1>
    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
      Outfit is loaded with 400 / 500 / 600 / 700 (see frontend/index.html Google Fonts link).
    </p>
    {[
      { weight: 400, name: 'Regular' },
      { weight: 500, name: 'Medium' },
      { weight: 600, name: 'Semibold' },
      { weight: 700, name: 'Bold' },
    ].map(({ weight, name }) => (
      <div
        key={weight}
        className="flex items-baseline gap-4 border-b pb-2"
        style={{ borderColor: 'var(--border-light)' }}
      >
        <code className="w-20 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {weight}
        </code>
        <code className="w-24 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {name}
        </code>
        <span
          className="text-xl"
          style={{ fontWeight: weight, color: 'var(--text-primary)' }}
        >
          {SAMPLE}
        </span>
      </div>
    ))}
  </div>
);
