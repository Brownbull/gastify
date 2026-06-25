import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { ShareTransactionsScreen } from "./ShareTransactionsScreen";

/**
 * Features/Groups/Screens/ShareTransactionsScreen — the full-page "Compartir
 * gastos" flow. Toggle Por compartir / Compartidas, 12 per page, multi-select →
 * batch bar (Deseleccionar / Compartir) → confirm. Reached from a group's
 * "Compartir gasto" and from the add action while in a group scope.
 */
const meta: Meta = {
  title: "Features/Groups/Screens/ShareTransactionsScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <ShareTransactionsScreen groupName="Familia González" platform={platform} onBack={() => {}} onShared={() => {}} />
      </AppSurface>
    );
  },
};
