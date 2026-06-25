import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReportDetail } from "./ReportDetail";
import { Card } from "./Card";
import { TIMEFRAME_REPORTS } from "@lib/reportTimeframeFixtures";

/**
 * ReportDetail (DM-34) — the CANONICAL Reports surface: the timeframe report
 * (weekly/monthly/quarterly/annual) with escalating density + the two sections
 * (🏪 establishments + 🛒 items). The Instagram-style story cards (ReportCard /
 * ReportCarousel) are the separate shareable "wrapped" extra; THIS is the report.
 */
const meta: Meta<typeof ReportDetail> = {
  title: "Design System/Molecules/ReportDetail",
  component: ReportDetail,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Weekly — the floor: hero + insight + top-3 establishments + top-3 items, no highlights. */
export const Weekly: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <Card title="Resumen" className="w-80">
        <ReportDetail report={TIMEFRAME_REPORTS.weekly} />
      </Card>
    </div>
  ),
};

/** Monthly — adds the 🏆 highlights card + uncaps both sections to all groups. */
export const Monthly: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <Card title="Resumen" className="w-80">
        <ReportDetail report={TIMEFRAME_REPORTS.monthly} />
      </Card>
    </div>
  ),
};

/** Annual — the richest year-in-review: persona hook + all-month highlights + 2-cat insight. */
export const Annual: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <Card title="Resumen" className="w-80">
        <ReportDetail report={TIMEFRAME_REPORTS.annual} />
      </Card>
    </div>
  ),
};
