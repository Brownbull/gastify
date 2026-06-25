import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanStatementSuccessScreen } from "./ScanStatementSuccessScreen";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";

/**
 * ScanStatementSuccessScreen — statement-scan screen 5: the terminal success
 * state after "Confirmar y guardar". Celebration hero + result recap
 * (conciliated / created / discarded + total saved) + exits (view transactions
 * / home). Platform toolbar switches mobile/tablet/desktop.
 */
const meta: Meta<typeof ScanStatementSuccessScreen> = {
  title: "Features/Scan/Screens/ScanStatementSuccessScreen",
  component: ScanStatementSuccessScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <ScanStatementSuccessScreen {...args} />
    </AppSurface>
  ),
};
