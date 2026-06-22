/* ARCHIVED 2026-06-17: batch-scan capture grid. Batch feature DEFERRED by user;
   kept for provenance, excluded from the Storybook glob (*.archive.tsx). */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanBatchCaptureScreen } from "./ScanBatchCaptureScreen.archive";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";

/**
 * ScanBatchCaptureScreen — batch-scan screen 1: gather multiple receipt images
 * before scanning. 4-col thumbnail grid (delete-X each + a dashed add tile),
 * count + cost estimate, Cancelar / Procesar lote footer. Tap the add tile to
 * add images; the cost + remaining credits update live. Platform toolbar switches
 * mobile/tablet/desktop.
 */
const meta: Meta<typeof ScanBatchCaptureScreen> = {
  title: "Features/Scan/ScanBatchCaptureScreen",
  component: ScanBatchCaptureScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: { initialCount: { control: { type: "range", min: 0, max: 8, step: 1 } } },
  args: { initialCount: 3 },
};

export default meta;
type Story = StoryObj<typeof meta>;

const inFrame: Story["render"] = (args, { globals }) => (
  <AppSurface platform={platformFromGlobals(globals)}>
    <ScanBatchCaptureScreen {...args} />
  </AppSurface>
);

/** Three images captured (default). */
export const Default: Story = { args: { initialCount: 3 }, render: inFrame };

/** Empty — Procesar lote disabled until at least one image is added. */
export const Empty: Story = { args: { initialCount: 0 }, render: inFrame };
