import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanReviewScreen } from "./ScanReviewScreen";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";

/**
 * ScanReviewScreen — simple-scan review with EDIT-IN-PLACE. Tap any field to edit
 * it where it sits: name (inline text), date/hora/currency (inline), category /
 * payment / location (full-screen pickers). Tap an item row to expand all its
 * fields (name, category, qty, unit price → total derived, delete). Footer is a
 * 2-column action row (X cancel · wide Guardar). Platform toolbar switches device.
 */
const meta: Meta<typeof ScanReviewScreen> = {
  title: "Features/Scan/ScanReviewScreen",
  component: ScanReviewScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { payment: "falabella" },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <ScanReviewScreen {...args} />
    </AppSurface>
  ),
};
