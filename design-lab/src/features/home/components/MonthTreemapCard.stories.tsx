import type { Meta, StoryObj } from "@storybook/react-vite";
import { emptyHome, sampleHome } from "../model/HomeScreenModel";
import { MonthTreemapCard } from "./MonthTreemapCard";

const meta = {
  title: "Features/Inicio/Components/Month Treemap Card",
  component: MonthTreemapCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Reference: legacy treemap dashboard (boletapp DashboardView + docs/mockups/screens/gastify-dashboard.html).",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MonthTreemapCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { blocks: sampleHome.treemap },
  render: (args) => (
    <div className="max-w-md bg-gt-bg p-6">
      <MonthTreemapCard {...args} />
    </div>
  ),
};

export const Empty: Story = {
  args: { blocks: emptyHome.treemap },
  render: (args) => (
    <div className="max-w-md bg-gt-bg p-6">
      <MonthTreemapCard {...args} />
    </div>
  ),
};
