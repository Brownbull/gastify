import type { Preview } from "@storybook/react-vite";
import "../src/styles/index.css";

/**
 * Single theme (Playful Geometric, DM-1) — no theme/mode selector.
 *
 * Platform toolbar: a global `platform` control (mobile / tablet / desktop).
 * Screen stories read it via `context.globals.platform` (see the
 * `platformFromGlobals` helper in design-system/organisms/AppSurface) so any
 * screen can be flipped across device frames from the toolbar — mirrors the
 * Gustify per-screen platform switch, surfaced as a top-level toolbar control.
 */
const preview: Preview = {
  globalTypes: {
    platform: {
      description: "Device frame for screen stories",
      toolbar: {
        title: "Platform",
        icon: "mobile",
        items: [
          { value: "mobile", title: "Mobile", icon: "mobile" },
          { value: "tablet", title: "Tablet", icon: "tablet" },
          { value: "desktop", title: "Desktop", icon: "browser" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    platform: "mobile",
  },
  parameters: {
    layout: "fullscreen",
    a11y: {
      test: "todo",
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
