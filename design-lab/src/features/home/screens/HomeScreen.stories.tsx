import type { Meta, StoryObj } from "@storybook/react-vite";
import { platformFromGlobals } from "@design-system/organisms/AppSurface";
import { HomeScreen } from "./HomeScreen";

/**
 * Platform is driven by the **Platform toolbar** (mobile / tablet / desktop) —
 * every story below reflows to the selected device frame, like Gustify. Pick a
 * story for the nav/state you want, then flip the toolbar to see each platform.
 * (The fixed per-platform snapshots live as separate exports at the bottom.)
 */
const meta = {
  title: "Features/Inicio/Screens/Home",
  component: HomeScreen,
  parameters: {
    docs: {
      description: {
        component:
          "Inicio assembled from App Shell organisms + Inicio components. The **Platform toolbar** drives mobile/tablet/desktop on every story. `ia` switches the two open IA candidates (Phase 7 decision): `redesigned` = 5-tab, `current` = 11-entry web nav. References: web/src/routes/index.tsx, docs/mockups/screens/gastify-dashboard{,-desktop}.html.",
      },
    },
  },
  tags: ["autodocs"],
  args: { ia: "redesigned", state: "default", menuOpen: false },
  argTypes: {
    ia: { control: "radio", options: ["current", "redesigned"] },
    state: { control: "radio", options: ["default", "empty"] },
    platform: { table: { disable: true } },
  },
  render: (args, ctx) => <HomeScreen {...args} platform={platformFromGlobals(ctx.globals)} />,
  decorators: [(Story) => <div className="bg-gt-bg p-8">{Story()}</div>],
} satisfies Meta<typeof HomeScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 5-tab IA — flip the Platform toolbar to reflow mobile → tablet → desktop. */
export const Default: Story = { args: { ia: "redesigned", state: "default" } };
export const Empty: Story = { args: { ia: "redesigned", state: "empty" } };

/** 11-entry web IA (sidebar on desktop, hamburger drawer on mobile/tablet). */
export const CurrentNav: Story = { args: { ia: "current", state: "default" } };
export const CurrentNavMenuOpen: Story = { args: { ia: "current", menuOpen: true } };

/* ── Fixed per-platform snapshots (ignore the toolbar; pinned for the record) ── */
export const PinnedMobile: Story = {
  args: { ia: "redesigned" },
  render: (args) => <HomeScreen {...args} platform="mobile" />,
};
export const PinnedTablet: Story = {
  args: { ia: "redesigned" },
  render: (args) => <HomeScreen {...args} platform="tablet" />,
};
export const PinnedDesktop: Story = {
  args: { ia: "redesigned" },
  render: (args) => <HomeScreen {...args} platform="desktop" />,
};
