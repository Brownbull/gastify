/* ARCHIVED 2026-06-16 (DM-2/DM-5): "IA Comparison" decision surface. IA settled =
   4-tab + scan FAB; kept for provenance, excluded from the Storybook glob. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DesktopComparison, MobileSideBySide } from "./IAComparisonSpike.archive";

/**
 * PHASE 3 DECISION SURFACE — pick the information architecture before any
 * screen batch starts. Single-candidate views live under
 * Features/Inicio/Screens/Home (via the `ia` control). This spike holds only
 * the side-by-side composites and is archived on decision.
 */
const meta = {
  title: "Features/Inicio/Spikes/IA Comparison",
  parameters: {
    docs: {
      description: {
        component:
          "**A · IA actual:** the 11-entry navigation web/ ships today (sidebar on desktop, hamburger drawer on mobile). **B · IA rediseñada:** the 5-tab structure locked in legacy BoletApp's 2026-03 mockup HANDOFF — Inicio | Compras | Escanear | Gastos | Perfil. Same Inicio content in both; chrome is the variable.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The decision shot — both mobile candidates next to each other. */
export const SideBySideMobile: Story = {
  render: () => <MobileSideBySide />,
};

export const DesktopsCompared: Story = {
  render: () => <DesktopComparison />,
};
