import type { Meta, StoryObj } from "@storybook/react-vite";
import { emptyHome, sampleHome } from "../model/HomeScreenModel";
import { RecentTransactionsCard } from "./RecentTransactionsCard";

const meta = {
  title: "Features/Home/Components/RecentTransactionsCard",
  component: RecentTransactionsCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof RecentTransactionsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { transactions: sampleHome.recent },
  render: (args) => (
    <div className="max-w-md bg-gt-bg p-6">
      <RecentTransactionsCard {...args} />
    </div>
  ),
};

export const Empty: Story = {
  args: { transactions: emptyHome.recent },
  render: (args) => (
    <div className="max-w-md bg-gt-bg p-6">
      <RecentTransactionsCard {...args} />
    </div>
  ),
};
