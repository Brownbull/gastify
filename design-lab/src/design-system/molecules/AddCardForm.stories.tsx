import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface } from "@design-system/organisms/AppSurface";
import { Button } from "@design-system/atoms/Button";
import { AddCardForm } from "./AddCardForm";
import { PaymentChip } from "./PaymentChip";
import type { PaymentMethod } from "@lib/paymentMethods";

const meta = {
  title: "Design System/Molecules/AddCardForm",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flow: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [card, setCard] = useState<PaymentMethod | null>(null);
    return (
      <div className="bg-gt-bg p-8">
        <AppSurface platform="mobile">
          <div className="relative min-h-[560px] p-6">
            <Button onClick={() => setOpen(true)}>Agregar tarjeta</Button>
            {card ? (
              <div className="mt-4">
                <p className="mb-1 text-gt-sm font-bold text-gt-ink-3">Creada:</p>
                <PaymentChip method={card} />
              </div>
            ) : null}
            <AddCardForm open={open} onClose={() => setOpen(false)} onSave={setCard} />
          </div>
        </AppSurface>
      </div>
    );
  },
};
