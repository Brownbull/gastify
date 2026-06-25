import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Card } from "./Card";

const meta = {
  title: "Design System/Molecules/Card",
  component: Card,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: { children: null },
  render: () => (
    <div className="max-w-md bg-gt-bg p-6">
      <Card title="Este Mes" action={<Badge tone="positive">−12% vs mayo</Badge>}>
        <p className="font-gt-display text-gt-4xl text-gt-ink">$384.520</p>
        <p className="mb-3 text-gt-sm text-gt-ink-3">42 transacciones · junio 2026</p>
        <Button variant="secondary" size="sm">Ver detalle</Button>
      </Card>
    </div>
  ),
};
