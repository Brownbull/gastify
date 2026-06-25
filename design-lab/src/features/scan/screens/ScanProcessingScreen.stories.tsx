import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanProcessingScreen } from "./ScanProcessingScreen";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import type { ScanPhase } from "@lib/scanFixtures";

/**
 * ScanProcessingScreen — simple-scan screen 2: the uploading → processing →
 * ready stages between capture and review. Use the `phase` control to inspect
 * each stage; the platform toolbar switches mobile/tablet/desktop.
 */
const meta: Meta<typeof ScanProcessingScreen> = {
  title: "Features/Scan/Screens/ScanProcessingScreen",
  component: ScanProcessingScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    phase: { control: "inline-radio", options: ["uploading", "processing", "ready", "failed"] as ScanPhase[] },
    progress: { control: { type: "range", min: 0, max: 100, step: 5 } },
  },
  args: { phase: "uploading", progress: 45, eta: "~5 segundos" },
};

export default meta;
type Story = StoryObj<typeof meta>;

const inFrame: Story["render"] = (args, { globals }) => (
  <AppSurface platform={platformFromGlobals(globals)}>
    <ScanProcessingScreen {...args} />
  </AppSurface>
);

export const Uploading: Story = { args: { phase: "uploading", progress: 45 }, render: inFrame };
export const Processing: Story = { args: { phase: "processing" }, render: inFrame };
export const Ready: Story = { args: { phase: "ready" }, render: inFrame };
/** Failed to read the receipt → Reintentar. */
export const Failed: Story = { args: { phase: "failed", failReason: "read" }, render: inFrame };
/** Out of scan credits → Mejorar a Pro. */
export const InsufficientCredits: Story = { args: { phase: "failed", failReason: "credits" }, render: inFrame };
