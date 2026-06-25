import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReportViewer } from "./ReportViewer";
import { Card } from "./Card";

const meta: Meta<typeof ReportViewer> = {
  title: "Design System/Molecules/ReportViewer",
  component: ReportViewer,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Settled Reports surface: "Resumen" + share icon, full-width timeframe bar, value stepper. */
export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <ReportViewer onShare={(period, value) => alert(`Compartir / descargar PDF — ${period} · ${value}`)} />
    </Card>
  ),
};

export const StartWeekly: Story = {
  render: () => (
    <Card className="w-80">
      <ReportViewer defaultPeriod="weekly" />
    </Card>
  ),
};

export const StartAnnual: Story = {
  render: () => (
    <Card className="w-80">
      <ReportViewer defaultPeriod="annual" />
    </Card>
  ),
};
