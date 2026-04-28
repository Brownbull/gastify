// Ladle config for the gastify mockup-as-React showcase surface.
// Phase 2 of the Ladle pivot — see ~/.claude/plans/okay-here-s-something-that-ancient-graham.md.
//
// Stories live next to their components: `<Component>.stories.tsx`.
// Production `vite build` does not import these files, so they're tree-shaken
// out of `frontend/dist/`. `ladle build` emits a separate static SPA at
// `frontend/build-ladle/` for deploying the showcase to a dev URL.

export default {
  stories: 'src/**/*.stories.{ts,tsx}',
  outDir: 'build-ladle',
  port: 5175,
  previewPort: 4176,
  addons: {
    // Viewport switcher. Picking a preset wraps the story in Ladle's iframe;
    // keep defaultState: 0 so stories render in the parent doc by default and
    // users opt-in per story or via the toolbar. Per-story `meta.width` can
    // override (Phase 6 Dashboard story uses width: 'mobile' = 390).
    width: {
      enabled: true,
      options: {
        mobile: 390,
        tablet: 768,
        desktop: 1440,
      },
      defaultState: 0,
    },
    // Light / dark color mode. URL param: `?theme=dark`. The Provider in
    // .ladle/components.tsx bridges this to the project's `.dark` class
    // convention used by global.css.
    theme: {
      enabled: true,
      defaultState: 'light',
    },
    control: { enabled: true },
    action: { enabled: true },
    source: { enabled: true },
  },
};
