import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanStatementUploadScreen } from "./ScanStatementUploadScreen";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";

/**
 * ScanStatementUploadScreen — statement-scan screen 1: upload a credit-card
 * statement PDF (card alias · PDF picker · password · mandatory AI consent ·
 * Iniciar escaneo, gated on file + consent). Grounded on the current app's
 * statements route. Platform toolbar switches mobile/tablet/desktop.
 */
const meta: Meta<typeof ScanStatementUploadScreen> = {
  title: "Features/Scan/Screens/ScanStatementUploadScreen",
  component: ScanStatementUploadScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

const inFrame: Story["render"] = (args, { globals }) => (
  <AppSurface platform={platformFromGlobals(globals)}>
    <ScanStatementUploadScreen {...args} />
  </AppSurface>
);

/** Empty — no file yet; Iniciar escaneo disabled. */
export const Default: Story = { args: { initialFile: false }, render: inFrame };

/** File selected — needs the consent checkbox before Iniciar escaneo enables. */
export const FileSelected: Story = { args: { initialFile: true }, render: inFrame };

/** Insufficient credits — the cost row warns and Iniciar escaneo is blocked. */
export const Insufficient: Story = { args: { initialFile: true, superCredits: 0 }, render: inFrame };
