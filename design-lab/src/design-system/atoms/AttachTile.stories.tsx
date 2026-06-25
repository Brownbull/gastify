import type { Meta, StoryObj } from "@storybook/react-vite";
import { AttachTile } from "./AttachTile";

const meta = {
  title: "Design System/Atoms/AttachTile",
  component: AttachTile,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { shape: "receipt", label: "Adjuntar" },
  argTypes: { shape: { control: "radio", options: ["receipt", "square"] } },
} satisfies Meta<typeof AttachTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Receipt: Story = {};
export const Square: Story = { args: { shape: "square" } };

export const Both: Story = {
  render: () => (
    <div className="flex items-start gap-4 bg-gt-bg p-4">
      <AttachTile shape="receipt" />
      <AttachTile shape="square" />
    </div>
  ),
};
