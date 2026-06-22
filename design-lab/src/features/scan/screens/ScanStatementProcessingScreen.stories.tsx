import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanStatementProcessingScreen } from "./ScanStatementProcessingScreen";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import type { StatementPhase } from "@lib/statementFixtures";

/**
 * ScanStatementProcessingScreen — statement-scan screen 2 (Procesar): the
 * streaming stages (uploading → queued → extracting → reconciling) with a
 * progress ring + the step indicator at step 2. Use the `phase` control to
 * inspect each stage; platform toolbar switches mobile/tablet/desktop.
 */
const meta: Meta<typeof ScanStatementProcessingScreen> = {
  title: "Features/Scan/Screens/ScanStatementProcessingScreen",
  component: ScanStatementProcessingScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    phase: { control: "inline-radio", options: ["uploading", "queued", "extracting", "reconciling"] as StatementPhase[] },
  },
  args: { phase: "extracting" },
};

export default meta;
type Story = StoryObj<typeof meta>;

const inFrame: Story["render"] = (args, { globals }) => (
  <AppSurface platform={platformFromGlobals(globals)}>
    <ScanStatementProcessingScreen {...args} />
  </AppSurface>
);

export const Uploading: Story = { args: { phase: "uploading" }, render: inFrame };
export const Extracting: Story = { args: { phase: "extracting" }, render: inFrame };
export const Reconciling: Story = { args: { phase: "reconciling" }, render: inFrame };
