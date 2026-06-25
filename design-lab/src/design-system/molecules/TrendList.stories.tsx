import type { Meta, StoryObj } from "@storybook/react-vite";
import { TrendList } from "./TrendList";
import { Card } from "./Card";
import { TRENDS, TRENDS_RICH } from "@lib/analyticsFixtures";

const meta = {
  title: "Design System/Molecules/TrendList",
  component: TrendList,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof TrendList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The trend list (faithful legacy distribution) — icon · name + count-pill
 * stacked · tight [56px sparkline + amount/change] cluster · drill chevron.
 * Direction-colored sparklines, entrance stagger, and DRILL-DOWN: tap a row's
 * chevron (Supermercados / Transporte) → giros → familias → categorías, with a
 * breadcrumb + back. The grey "Más" aggregate (+ categoryCount badge) sinks last.
 */
export const Default: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <Card title="Tendencia" className="w-80">
        <TrendList data={TRENDS_RICH} />
      </Card>
    </div>
  ),
};

/** Without the count pill (plain TRENDS) — name only above the cluster. */
export const NoCount: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <Card title="Tendencia" className="w-80">
        <TrendList data={TRENDS} showCount={false} />
      </Card>
    </div>
  ),
};

/** Sparkline colored by the locked category palette instead of spend direction. */
export const CategoryColor: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <Card title="Tendencia" className="w-80">
        <TrendList data={TRENDS_RICH} colorMode="category" />
      </Card>
    </div>
  ),
};
