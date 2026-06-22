import type { Meta, StoryObj } from "@storybook/react-vite";
import { TransactionTotal } from "./TransactionTotal";
import { sampleTxn, sampleItems } from "@lib/transactionFixtures";

const meta = {
  title: "Design System/Molecules/TransactionTotal",
  component: TransactionTotal,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { total: sampleTxn.total, itemCount: sampleItems.length, payment: sampleTxn.payment },
} satisfies Meta<typeof TransactionTotal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPayment: Story = {
  render: (args) => (
    <div className="w-80 bg-gt-bg p-4">
      <TransactionTotal {...args} />
    </div>
  ),
};

export const NoPayment: Story = {
  args: { payment: undefined },
  render: (args) => (
    <div className="w-80 bg-gt-bg p-4">
      <TransactionTotal {...args} />
    </div>
  ),
};
