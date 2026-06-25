import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { MonthTrendCard } from "./MonthTrendCard";

/**
 * Features/Home/Components/MonthTrendCard — the Home "Tendencia" rep: monthly
 * spend over the last N months (current highlighted) + the trailing average.
 */
const meta: Meta = {
  title: "Features/Home/Components/MonthTrendCard",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <div className="mx-auto w-full" style={{ maxWidth: "30rem" }}>
        <MonthTrendCard />
      </div>
    </AppSurface>
  ),
};
