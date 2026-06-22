import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReportCard } from "./ReportCard";
import { ReportCarousel } from "./ReportCarousel";
import { SAMPLE_REPORT } from "@lib/reportFixtures";

/**
 * ReportCard / ReportCarousel — the SECONDARY "wrapped/share" surface (DM-33):
 * full-screen Instagram-style story cards. The CANONICAL Reports surface is the
 * timeframe report `ReportDetail` (DM-34) — see Molecules/ReportDetail. These
 * cards are the shareable moment, not the report itself.
 */
const meta: Meta<typeof ReportCard> = {
  title: "Design System/Molecules/ReportCard",
  component: ReportCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The settled Reports presentation (DM-33 pick B) — full-screen story cards, one
 * per type, gradient by type (summary/trend/milestone/category). The shareable
 * "wrapped" moment; the `Carousel` story is the swipeable story-mode flow.
 */
export const Types: Story = {
  render: () => (
    <div className="flex flex-wrap gap-gt-16 bg-gt-bg p-gt-16">
      {SAMPLE_REPORT.cards.map((c) => (
        <div key={c.id} className="w-72">
          <ReportCard type={c.type} title={c.title} primaryValue={c.primaryValue} secondaryValue={c.secondaryValue} trend={c.trend} icon={c.icon} description={c.description} />
        </div>
      ))}
    </div>
  ),
};

/** The carousel — swipe/click the dots to move between report cards. */
export const Carousel: Story = {
  render: () => (
    <div className="w-80 bg-gt-bg p-gt-16">
      <ReportCarousel cards={SAMPLE_REPORT.cards} />
    </div>
  ),
};
