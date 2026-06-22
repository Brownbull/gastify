import type { Meta, StoryObj } from "@storybook/react-vite";
import { HistoryItemRow } from "./HistoryItemRow";
import { sampleHistoryItems } from "@lib/transactionFixtures";

const meta = {
  title: "Design System/Molecules/HistoryItemRow",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Card({ children }: { children: React.ReactNode }) {
  return (
    <ul className="w-80 divide-y divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
      {children}
    </ul>
  );
}

export const List: Story = {
  render: () => (
    <Card>
      {sampleHistoryItems.map((it) => (
        <HistoryItemRow key={it.name} item={it} />
      ))}
    </Card>
  ),
};

export const ExpandedByDefault: Story = {
  render: () => (
    <Card>
      <HistoryItemRow item={sampleHistoryItems[0]} defaultOpen />
      <HistoryItemRow item={sampleHistoryItems[3]} />
    </Card>
  ),
};
