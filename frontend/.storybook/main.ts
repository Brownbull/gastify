// Storybook 10 config for the gastify mockup-as-React showcase surface.
// Pivot 2A→2B (axis 2 of the Ladle pivot plan) — see DECISIONS.md D25.
//
// Stories live next to their components: `<Component>.stories.tsx`.
// Production `vite build` does not import these files, so they're tree-shaken
// out of `frontend/dist/`. `storybook build` emits a separate static SPA at
// `frontend/storybook-static/` for deploying the showcase to a dev URL.

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
