import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface } from "@design-system/organisms/AppSurface";
import { PaymentChip } from "./PaymentChip";
import { PaymentPicker } from "./PaymentPicker";
import { SAMPLE_METHODS, getPaymentMethod, type PaymentMethod } from "@lib/paymentMethods";

/**
 * Payment picker flow (DM-10): tap the chip → pick a method, or "Agregar
 * tarjeta" → alias/icon/color → it appears in the list and is selected.
 * Rendered inside AppSurface so the Modal positions within the device frame.
 */
const meta = {
  title: "Design System/Molecules/PaymentPicker",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flow: Story = {
  render: () => {
    const [methods, setMethods] = useState<PaymentMethod[]>(SAMPLE_METHODS);
    const [selected, setSelected] = useState("falabella");
    const [open, setOpen] = useState(false);
    return (
      <div className="bg-gt-bg p-8">
        <AppSurface platform="mobile">
          <div className="relative min-h-[600px] p-6">
            <p className="mb-3 text-gt-sm font-bold text-gt-ink-3">Toca el método para cambiarlo:</p>
            <PaymentChip method={getPaymentMethod(selected, methods)} onClick={() => setOpen(true)} />
            <PaymentPicker
              open={open}
              onClose={() => setOpen(false)}
              methods={methods}
              selectedId={selected}
              onSelect={setSelected}
              onAddCard={(card) => setMethods((prev) => [...prev, card])}
            />
          </div>
        </AppSurface>
      </div>
    );
  },
};
