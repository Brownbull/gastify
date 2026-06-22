import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanStatementReconcileScreen } from "./ScanStatementReconcileScreen";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";

/**
 * ScanStatementReconcileScreen — statement-scan screen 3 (Conciliar): the
 * bucket-tabbed reconciliation (matched / statement-only / app-only / ambiguous
 * / failed) + coverage metrics. "Crear transacción" on statement-only lines;
 * other buckets are review-only. Grounded on the current app's
 * StatementReconciliationPanel. Platform toolbar switches mobile/tablet/desktop.
 */
const meta: Meta<typeof ScanStatementReconcileScreen> = {
  title: "Features/Scan/Screens/ScanStatementReconcileScreen",
  component: ScanStatementReconcileScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <ScanStatementReconcileScreen {...args} />
    </AppSurface>
  ),
};
