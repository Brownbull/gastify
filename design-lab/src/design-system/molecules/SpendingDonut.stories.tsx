import type { Meta, StoryObj } from "@storybook/react-vite";
import { SpendingDonut } from "./SpendingDonut";
import { Card } from "./Card";
import { SAMPLE_REPORT } from "@lib/reportFixtures";

const meta: Meta<typeof SpendingDonut> = {
  title: "Design System/Molecules/SpendingDonut",
  component: SpendingDonut,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The static report donut — pure-SVG wedges + center total + inline side legend. */
export const Default: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <Card title="Resumen · Junio" className="w-80">
        <SpendingDonut segments={SAMPLE_REPORT.segments} total={SAMPLE_REPORT.total} periodLabel="Junio" />
      </Card>
    </div>
  ),
};

/** Donut only (no legend) — for compact / embedded contexts. */
export const NoLegend: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <SpendingDonut segments={SAMPLE_REPORT.segments} total={SAMPLE_REPORT.total} periodLabel="Junio" hideLegend size={140} />
    </div>
  ),
};
