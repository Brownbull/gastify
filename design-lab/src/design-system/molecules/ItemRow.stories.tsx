import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemRow } from "./ItemRow";
import { sampleItems } from "@lib/transactionFixtures";

const meta = {
  title: "Design System/Molecules/ItemRow",
  component: ItemRow,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { item: sampleItems[0], density: "tight" },
  argTypes: {
    density: { control: "radio", options: ["tight", "comfortable"] },
    tone: { control: "radio", options: ["default", "negative"] },
  },
} satisfies Meta<typeof ItemRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Rows live inside a single bordered "card of rows" with 1px hairline dividers.
function Card({ children }: { children: React.ReactNode }) {
  return (
    <ul className="w-80 divide-y divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
      {children}
    </ul>
  );
}

export const Single: Story = {
  render: (args) => (
    <Card>
      <ItemRow {...args} />
    </Card>
  ),
};

export const List: Story = {
  render: (args) => (
    <Card>
      {sampleItems.map((it) => (
        <ItemRow key={it.name} item={it} density={args.density} />
      ))}
    </Card>
  ),
};

export const OriginalIndexed: Story = {
  render: (args) => (
    <Card>
      {sampleItems.map((it, i) => (
        <ItemRow key={it.name} item={it} index={i + 1} density={args.density} />
      ))}
    </Card>
  ),
};

export const NegativeTone: Story = {
  render: () => (
    <Card>
      <ItemRow item={sampleItems[0]} tone="negative" />
      <ItemRow item={sampleItems[1]} />
    </Card>
  ),
};
