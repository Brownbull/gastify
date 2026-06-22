import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanModeChooserScreen } from "./ScanModeChooserScreen";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";

/**
 * ScanModeChooserScreen — the scan "front door" the scan FAB opens: pick
 * Escanear boleta (single-receipt flow), Subir cartola (statement flow), or
 * Ingreso manual. Platform toolbar switches mobile/tablet/desktop.
 */
const meta: Meta<typeof ScanModeChooserScreen> = {
  title: "Features/Scan/Screens/ScanModeChooserScreen",
  component: ScanModeChooserScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <ScanModeChooserScreen {...args} />
    </AppSurface>
  ),
};
