import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { StatementsListScreen } from "./StatementsListScreen";

/**
 * Features/Scan/Screens/StatementsListScreen — the uploaded cartolas (backend GET
 * /statements). Card + period + status (Conciliada w/ coverage / Procesando /
 * Con error), a lock on password-protected PDFs, and "Subir cartola".
 */
const meta: Meta = {
  title: "Features/Scan/Screens/StatementsListScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <StatementsListScreen platform={platform} onBack={() => {}} onUpload={() => {}} onOpenStatement={() => {}} />
      </AppSurface>
    );
  },
};

export const Empty: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <StatementsListScreen platform={platform} statements={[]} onBack={() => {}} onUpload={() => {}} />
      </AppSurface>
    );
  },
};
