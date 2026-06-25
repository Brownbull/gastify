import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanStatementConfirmScreen } from "./ScanStatementConfirmScreen";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";

/**
 * ScanStatementConfirmScreen — statement-scan screen 4 (Confirmar): the commit
 * step. Statistics + the projected outcome (created / conciliated / discarded)
 * of everything staged on Conciliar. Read-only review; the back arrow returns to
 * Conciliar and "Confirmar y guardar" commits. Platform toolbar switches
 * mobile/tablet/desktop.
 */
const meta: Meta<typeof ScanStatementConfirmScreen> = {
  title: "Features/Scan/Screens/ScanStatementConfirmScreen",
  component: ScanStatementConfirmScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <ScanStatementConfirmScreen {...args} />
    </AppSurface>
  ),
};
