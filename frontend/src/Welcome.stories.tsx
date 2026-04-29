// Sentinel story for Storybook 10 — verifies the showcase pipeline boots:
// decorators apply (theme + viewport switchers), theme tokens cascade, and
// Tailwind 4 utilities compile from src/styles/global.css.
//
// Replace or delete when Phase 4 lands real atom stories.

import type { Meta, StoryFn } from '@storybook/react-vite';

const meta: Meta = {
  title: 'Welcome',
};

export default meta;

export const Hello: StoryFn = () => (
  <div className="p-8 max-w-md mx-auto">
    <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--primary)' }}>
      Ladle is up.
    </h1>
    <p className="text-base mb-2">This sentinel story proves:</p>
    <ul className="list-disc pl-6 space-y-1" style={{ color: 'var(--text-secondary)' }}>
      <li>
        Tailwind 4 utilities compile (
        <code className="px-1 rounded" style={{ background: 'var(--bg-tertiary)' }}>
          p-8 max-w-md text-3xl
        </code>
        ).
      </li>
      <li>
        Theme tokens cascade (
        <code className="px-1 rounded" style={{ background: 'var(--bg-tertiary)' }}>
          var(--primary)
        </code>{' '}
        renders).
      </li>
      <li>
        Light/dark toggle in the Ladle controls switches the <code>.dark</code> class.
      </li>
      <li>Viewport switcher (mobile / tablet / desktop) resizes the frame.</li>
    </ul>
    <p className="mt-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
      Phase 2 of the Ladle pivot. Phase 3 adds story conventions and a theme switcher
      (normal / professional / mono).
    </p>
  </div>
);
