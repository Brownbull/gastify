import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Card } from "./Card";
import { MetricCard, StatValue, SummaryStats } from "./SummaryStats";

const meta = {
  title: "Design System/Molecules/SummaryStats",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const HeroMetric: Story = {
  render: () => (
    <div className="max-w-sm bg-gt-bg p-6">
      <MetricCard
        label="Este mes · junio 2026"
        value="$384.520"
        delta={{ tone: "positive", label: "−12% vs mayo" }}
        icon={<PixelIcon name="fin-piggy-bank" size={22} />}
      />
    </div>
  ),
};

export const StatRow: Story = {
  render: () => (
    <div className="max-w-md bg-gt-bg p-6">
      <Card>
        <SummaryStats>
          <StatValue value="42" label="transacciones" />
          <StatValue value="$9.155" label="promedio" />
          <StatValue value="18" label="comercios" />
        </SummaryStats>
      </Card>
    </div>
  ),
};
