import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconTile } from "./IconTile";
import { getCategoryToken } from "@lib/categoryTokens";

const meta = {
  title: "Design System/Atoms/IconTile",
  component: IconTile,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { icon: "store-supermarket", size: "md" },
  argTypes: { size: { control: "radio", options: ["sm", "md", "lg", "hero"] } },
} satisfies Meta<typeof IconTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-gt-10 bg-gt-bg p-gt-16">
      <IconTile icon="store-supermarket" size="sm" />
      <IconTile icon="store-supermarket" size="md" />
      <IconTile icon="store-supermarket" size="lg" />
      <IconTile icon="store-supermarket" size="hero" />
    </div>
  ),
};

export const Tinted: Story = {
  render: () => (
    <div className="flex items-center gap-gt-10 bg-gt-bg p-gt-16">
      <IconTile icon={getCategoryToken("supermercados").icon} tint={getCategoryToken("supermercados").tint} />
      <IconTile icon={getCategoryToken("restaurantes").icon} tint={getCategoryToken("restaurantes").tint} />
      <IconTile icon={getCategoryToken("salud-bienestar").icon} tint={getCategoryToken("salud-bienestar").tint} />
    </div>
  ),
};

export const WithNumber: Story = {
  render: () => (
    <div className="flex items-center gap-gt-10 bg-gt-bg p-gt-16">
      <IconTile size="md"><span className="font-gt-display text-gt-md font-extrabold text-gt-ink-3">1</span></IconTile>
      <IconTile size="md"><span className="font-gt-display text-gt-md font-extrabold text-gt-ink-3">12</span></IconTile>
    </div>
  ),
};
