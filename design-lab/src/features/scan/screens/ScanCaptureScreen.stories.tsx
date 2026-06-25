import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanCaptureScreen } from "./ScanCaptureScreen";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";

/**
 * ScanCaptureScreen — simple-scan capture (screen 1). Faithful to legacy
 * BoletApp: an idle prompt + take-photo / gallery source choice (no fake camera
 * feed). Rendered full-bleed in the AppSurface device frame; use the Storybook
 * platform toolbar to switch mobile/tablet/desktop.
 */
const meta: Meta<typeof ScanCaptureScreen> = {
  title: "Features/Scan/Screens/ScanCaptureScreen",
  component: ScanCaptureScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (_args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <ScanCaptureScreen />
    </AppSurface>
  ),
};
