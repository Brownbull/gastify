import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemGroup } from "./ItemGroup";
import { ItemRow } from "./ItemRow";
import { sampleTxn } from "@lib/transactionFixtures";

const meta = {
  title: "Design System/Molecules/ItemGroup",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Groups: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-gt-12 bg-gt-bg p-gt-16">
      {sampleTxn.groups.map((g) => (
        <ItemGroup
          key={g.familia}
          familia={g.familia}
          count={g.items.length}
          total={g.items.reduce((s, i) => s + i.total, 0)}
        >
          {g.items.map((it) => (
            <ItemRow key={it.name} item={it} density="tight" />
          ))}
        </ItemGroup>
      ))}
    </div>
  ),
};
