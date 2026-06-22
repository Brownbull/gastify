import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";

const meta = {
  title: "Design System/Atoms/Badge",
  component: Badge,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Semantic spending badge — positive = spending DOWN (good), negative = spending UP (bad), per the BoletApp semantic color contract.",
      },
    },
  },
  tags: ["autodocs"],
  args: { children: "−12% vs mayo", tone: "positive" },
  argTypes: { tone: { control: "radio", options: ["positive", "negative", "neutral", "warning"] } },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 bg-gt-bg p-6">
      <Badge tone="positive">−12% vs mayo</Badge>
      <Badge tone="negative">+$4.990</Badge>
      <Badge tone="neutral">12 ítems</Badge>
      <Badge tone="warning">duplicado</Badge>
    </div>
  ),
};
