import type { Meta, StoryObj } from "@storybook/react-vite";
import { MerchantHeader } from "./MerchantHeader";
import { sampleTxn } from "@lib/transactionFixtures";

const meta = {
  title: "Design System/Molecules/MerchantHeader",
  component: MerchantHeader,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { txn: sampleTxn },
} satisfies Meta<typeof MerchantHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Compact: Story = {
  render: (args) => (
    <div className="w-80 bg-gt-bg p-4">
      <MerchantHeader {...args} />
    </div>
  ),
};
