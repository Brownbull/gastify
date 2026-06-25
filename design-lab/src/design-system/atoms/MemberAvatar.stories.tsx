import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemberAvatar } from "./MemberAvatar";

/**
 * Design System/Atoms/MemberAvatar — initials on a member's accent color. The
 * initials use ink or white per WCAG contrast, so light accents (amber/emerald)
 * stay legible. `Accents` demonstrates the auto-contrast across the palette.
 */
const meta = {
  title: "Design System/Atoms/MemberAvatar",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const PEOPLE: { name: string; color: string }[] = [
  { name: "Rodrigo González", color: "#7B6EF6" },
  { name: "Camila Rojas", color: "#EC4899" },
  { name: "Sofía Soto", color: "#10B981" },
  { name: "Matías Mella", color: "#F59E0B" },
  { name: "Diego Pérez", color: "#3B82F6" },
  { name: "Paula Díaz", color: "#14B8A6" },
];

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-gt-8">
      <MemberAvatar name="Camila Rojas" color="#7B6EF6" size="sm" />
      <MemberAvatar name="Camila Rojas" color="#7B6EF6" size="md" />
      <MemberAvatar name="Camila Rojas" color="#7B6EF6" size="lg" />
    </div>
  ),
};

export const Accents: Story = {
  render: () => (
    <div className="flex flex-wrap gap-gt-8">
      {PEOPLE.map((p) => (
        <MemberAvatar key={p.color} name={p.name} color={p.color} size="md" />
      ))}
    </div>
  ),
};
