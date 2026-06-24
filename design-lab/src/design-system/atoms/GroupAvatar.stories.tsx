import type { Meta, StoryObj } from "@storybook/react-vite";
import { GroupAvatar } from "./GroupAvatar";

/**
 * Design System/Atoms/GroupAvatar — a group's emoji-on-accent-tint identity tile
 * (backend group-avatar model: emoji + hex). Tolerates #RGB and #RRGGBB.
 */
const meta = {
  title: "Design System/Atoms/GroupAvatar",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ACCENTS: { icon: string; color: string }[] = [
  { icon: "🏡", color: "#7B6EF6" },
  { icon: "🛋️", color: "#10B981" },
  { icon: "🏔️", color: "#F59E0B" },
  { icon: "🎉", color: "#EC4899" },
  { icon: "✈️", color: "#3B82F6" },
];

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-gt-12">
      <GroupAvatar icon="🏡" color="#7B6EF6" size="sm" />
      <GroupAvatar icon="🏡" color="#7B6EF6" size="md" />
      <GroupAvatar icon="🏡" color="#7B6EF6" size="lg" />
    </div>
  ),
};

export const Accents: Story = {
  render: () => (
    <div className="flex flex-wrap gap-gt-12">
      {ACCENTS.map((a) => (
        <GroupAvatar key={a.color} icon={a.icon} color={a.color} size="lg" />
      ))}
    </div>
  ),
};
