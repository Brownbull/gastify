import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReportDetail } from "@design-system/molecules/ReportDetail";
import { SegmentedToggle } from "@design-system/atoms/SegmentedToggle";
import { Card } from "@design-system/molecules/Card";
import { TIMEFRAME_REPORTS, REPORT_PERIOD_META, type ReportPeriod } from "@lib/reportTimeframeFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Reports (DM-34, rebuilt timeframe-aware). A report comes in FOUR
 * timeframes (Semanal/Mensual/Trimestral/Anual) with ESCALATING density (same
 * layout, more fields): hero + 💡 insight + 🏆 highlights (monthly/quarterly/
 * annual only) + 🏪 establishments section (donut + group cards) + 🛒 items
 * section. Weekly = top-3 groups + no highlights; annual = the richest.
 *
 * A/B/C/D = the FOUR timeframes so you can see the density escalate. The "compare"
 * board shows the interactive timeframe selector driving one report.
 */
function Report({ period }: { period: ReportPeriod }) {
  return (
    <Card title="Resumen" className="w-80">
      <ReportDetail report={TIMEFRAME_REPORTS[period]} />
    </Card>
  );
}

/** Interactive: the timeframe selector driving the report density. */
function InteractiveReport() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  return (
    <Card title="Resumen" className="w-80">
      <div className="mb-gt-12 flex justify-center">
        <SegmentedToggle
          segments={REPORT_PERIOD_META.map((p) => ({ id: p.id, label: p.label }))}
          value={period}
          onChange={(id) => setPeriod(id as ReportPeriod)}
          tone="primary"
          size="sm"
        />
      </div>
      <ReportDetail report={TIMEFRAME_REPORTS[period]} />
    </Card>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Semanal (floor)", note: "Weekly: hero + insight + top-3 establishments + top-3 items. NO highlights, groups capped at 3. The lightest report.", render: () => <Report period="weekly" /> },
  { id: "B", label: "Mensual (+ highlights, all groups)", note: "Monthly adds the 🏆 highlights card + uncaps BOTH sections to all groups (alphabetical). Holiday-aware insight.", render: () => <Report period="monthly" /> },
  { id: "C", label: "Trimestral (+ hook)", note: "Quarterly adds a persona-hook quote + richer highlights (high/low month + biggest increase) + seasonal insight.", render: () => <Report period="quarterly" /> },
  { id: "D", label: "Anual (richest)", note: "The year-in-review: persona hook, highlights over all 12 months, 2-category insight. The most complete report.", render: () => <Report period="annual" /> },
  { id: "E", label: "Interactive selector", note: "The real UX: a Semanal/Mensual/Trimestral/Anual toggle driving one report — flip it to watch the density escalate.", render: () => <InteractiveReport /> },
];

const meta = {
  title: "Design System/Spikes/Diagram · Reports",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike
      title="Reports — timeframe density (weekly → annual)"
      intro="A report = hero + 💡 insight + 🏆 highlights (M/Q/A) + 🏪 establishments section (donut + group cards) + 🛒 items section. Density escalates W→A (weekly top-3 + no highlights; monthly+ all groups + highlights; annual richest). A/B/C/D = the 4 timeframes; E = the interactive selector. Switch platform to judge at width."
      options={OPTIONS}
      {...args}
    />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
