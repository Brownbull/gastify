import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip } from "./Chip";

const meta = {
  title: "Design System/Atoms/Chip",
  component: Chip,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Filter chip with the legacy 3-state contract (original / pending / active, commit-on-label) — see docs/mockups/AUDIT.md §8.",
      },
    },
  },
  tags: ["autodocs"],
  args: { children: "Este mes", state: "default" },
  argTypes: { state: { control: "radio", options: ["default", "pending", "active"] } },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const FilterStrip: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 bg-gt-bg p-6">
      <Chip state="active">Junio 2026</Chip>
      <Chip state="pending">Supermercado</Chip>
      <Chip state="default">Transporte</Chip>
      <Chip state="default">Salud</Chip>
      <Chip state="default">Restaurantes</Chip>
    </div>
  ),
};
