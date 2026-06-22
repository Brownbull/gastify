import type { Meta, StoryObj } from "@storybook/react-vite";
import { PaymentChip } from "./PaymentChip";
import { SAMPLE_METHODS } from "@lib/paymentMethods";

/**
 * Payment indicator (DM-8). Cash = fixed pixel-coin icon; cards = color swatch
 * + nickname. No card data stored — label + hue only.
 */
const meta = {
  title: "Design System/Molecules/PaymentChip",
  component: PaymentChip,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { method: "falabella", size: "md" },
  argTypes: {
    method: { control: "select", options: SAMPLE_METHODS.map((m) => m.id) },
    size: { control: "radio", options: ["sm", "md"] },
  },
} satisfies Meta<typeof PaymentChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllMethods: Story = {
  render: () => (
    <div className="flex flex-col gap-4 bg-gt-bg p-6">
      <div className="flex flex-wrap items-center gap-2">
        {SAMPLE_METHODS.map((m) => (
          <PaymentChip key={m.id} method={m} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {SAMPLE_METHODS.map((m) => (
          <PaymentChip key={m.id} method={m} size="sm" />
        ))}
      </div>
    </div>
  ),
};
