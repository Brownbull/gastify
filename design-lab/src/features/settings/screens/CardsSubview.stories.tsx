import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { CardsSubview } from "./CardsSubview";

/**
 * Features/Settings/Screens/CardsSubview — "Mis tarjetas": card aliases for
 * statement reconciliation. Rename inline, add (AddCardForm), archive/restore.
 * No card numbers / CVV / expiry are stored — alias only.
 */
const meta: Meta = {
  title: "Features/Settings/Screens/CardsSubview",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <CardsSubview onBack={() => {}} />
    </AppSurface>
  ),
};
