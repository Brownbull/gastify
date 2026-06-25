import type { Meta, StoryObj } from "@storybook/react-vite";
import { TransactionCard } from "./TransactionCard";
import { BROWSE_TRANSACTIONS } from "@lib/browseFixtures";

const meta: Meta<typeof TransactionCard> = {
  title: "Design System/Molecules/TransactionCard",
  component: TransactionCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

const txn = BROWSE_TRANSACTIONS[0].transactions[0];

export const Default: Story = {
  render: () => (
    <div className="w-80 bg-gt-bg p-gt-16">
      <TransactionCard txn={txn} />
    </div>
  ),
};

export const Expanded: Story = {
  render: () => (
    <div className="w-80 bg-gt-bg p-gt-16">
      <TransactionCard txn={txn} expanded />
    </div>
  ),
};

export const List: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-gt-8 bg-gt-bg p-gt-16">
      {BROWSE_TRANSACTIONS[0].transactions.map((t) => (
        <TransactionCard key={t.id} txn={t} />
      ))}
    </div>
  ),
};
