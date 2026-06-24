import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { CategoryDetailScreen } from "./CategoryDetailScreen";

/**
 * Features/Spending/Screens/CategoryDetailScreen — the category drill-down report,
 * opened from a Gastos legend count-pill. Summary (total / share / trend),
 * sub-category breakdown, and the category's transactions.
 */
const meta: Meta = {
  title: "Features/Spending/Screens/CategoryDetailScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Supermercados: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <CategoryDetailScreen categoryId="supermercados" platform={platform} onBack={() => {}} />
      </AppSurface>
    );
  },
};

export const Restaurantes: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <CategoryDetailScreen categoryId="restaurantes" platform={platform} onBack={() => {}} />
      </AppSurface>
    );
  },
};
