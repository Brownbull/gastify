/* ARCHIVED 2026-06-16 (DM-1): "Geometría Gustify (chosen)" style reference. Style is
   locked + the real components are built; kept for provenance, excluded from the
   Storybook glob (*.archive.tsx). */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { GustifyGeometricHome } from "./StyleGustifyGeometricSpike.archive";

/**
 * STYLE DECIDED (DM-1, 2026-06-10): Geometría / Full Gustify palette.
 *
 * This is now the reference render for the chosen direction (kept until the
 * real geometric atoms/molecules/organisms land in Phases 5–8, then archived).
 * The not-chosen Boleta Cálida spike is at spikes/archive/. It still uses
 * inline Gustify-palette constants; once tokens are token-backed end-to-end
 * the screen rebuild (Phase 8) replaces this.
 */
const meta = {
  title: "Features/Inicio/Spikes/Style Reference",
  parameters: {
    docs: {
      description: {
        component:
          "Chosen direction: gastify adopts Gustify's Playful Geometric look — violet primary, amber/pink/emerald accents, cream canvas, slate-900 ink, 2–3px ink borders, hard zero-blur offset shadows, bold Outfit. Pixel icons carry every meaningful glyph. Reference render of Inicio until the real geometric components are built (Phases 5–8).",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const GeometriaGustify: Story = {
  name: "Geometría Gustify (chosen)",
  render: () => (
    <div className="bg-gt-bg p-8">
      <GustifyGeometricHome />
    </div>
  ),
};
