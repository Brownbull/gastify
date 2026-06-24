import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { ScanBatchCaptureScreen } from "./ScanBatchCaptureScreen";

/**
 * Features/Scan/Screens/ScanBatchCaptureScreen — batch-scan step 1: gather
 * multiple receipt images (add/remove tiles) before processing the lote.
 */
const meta: Meta = {
  title: "Features/Scan/Screens/ScanBatchCaptureScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <ScanBatchCaptureScreen onBack={() => {}} onProcess={() => {}} />
    </AppSurface>
  ),
};
