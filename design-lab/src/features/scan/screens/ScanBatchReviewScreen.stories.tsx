import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { ScanBatchReviewScreen } from "./ScanBatchReviewScreen";

/**
 * Features/Scan/Screens/ScanBatchReviewScreen — batch-scan step 2: the per-receipt
 * queue. Each row lands done (merchant + total), failed (Reintentar / descartar),
 * or processing; the footer saves the done receipts once nothing is processing.
 */
const meta: Meta = {
  title: "Features/Scan/Screens/ScanBatchReviewScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <ScanBatchReviewScreen platform={platform} onBack={() => {}} onSave={() => {}} onScanMore={() => {}} />
      </AppSurface>
    );
  },
};
