import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { GravityCentersCard } from "./GravityCentersCard";

/**
 * Features/Home/Components/GravityCentersCard — REQ-10 concentration insight:
 * categories far above (▲) or below (▼) your trailing 3-month average, each with
 * its multiplier. Lives on the Inicio dashboard under the treemap.
 */
const meta: Meta = {
  title: "Features/Home/Components/GravityCentersCard",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <div className="mx-auto w-full" style={{ maxWidth: "30rem" }}>
        <GravityCentersCard />
      </div>
    </AppSurface>
  ),
};
