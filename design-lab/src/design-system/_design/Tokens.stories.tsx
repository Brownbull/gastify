import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ColorTokenGrid,
  GeometricGrammar,
  ShapeAndElevation,
  TypographySpecimen,
} from "./TokenShowcase";

/**
 * Token foundation — Playful Geometric single theme (DM-1).
 * Source of truth: shared/design-tokens.ts. Palette + grammar adopted from
 * Gustify (Playful Geometric), exposed as `gt-*` Tailwind utilities.
 */
const meta = {
  title: "Design System/Tokens",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "gastify token foundation: Playful Geometric single theme — violet primary, amber/pink/emerald accents, cream canvas, slate-900 ink — with the geometric grammar (2–3px ink borders, hard zero-blur offset shadows, bold type). Exposed as `gt-*` Tailwind utilities backed by runtime CSS vars. Reference: `shared/design-tokens.ts`.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {
  render: () => <ColorTokenGrid />,
};

export const Grammar: Story = {
  name: "Geometric Grammar",
  render: () => <GeometricGrammar />,
};

export const Typography: Story = {
  render: () => <TypographySpecimen />,
};

export const ShapesAndElevation: Story = {
  name: "Radii & Shadows",
  render: () => <ShapeAndElevation />,
};
