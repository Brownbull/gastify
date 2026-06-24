import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { NewTransactionScreen } from "./NewTransactionScreen";

/**
 * Features/Purchases/Screens/NewTransactionScreen — manual transaction entry (no
 * scan), reached from the scan mode chooser's "Ingresar manualmente". Tap the
 * header fields to fill them; add items one-by-one; the footer folds the live
 * total into "Crear".
 */
const meta: Meta = {
  title: "Features/Purchases/Screens/NewTransactionScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <NewTransactionScreen platform={platform} onBack={() => {}} onCreate={() => {}} />
      </AppSurface>
    );
  },
};
