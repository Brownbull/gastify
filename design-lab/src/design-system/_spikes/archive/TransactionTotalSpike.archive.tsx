import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { PaymentChip } from "@design-system/molecules/PaymentChip";
import { clp, sampleTxn as T, sampleItems } from "@lib/transactionFixtures";
import { getPaymentMethod } from "@lib/paymentMethods";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Transaction total footer: payment + total + save. Variations explore
 * whether/where payment shows and how the total relates to the CTA.
 */
const N = sampleItems.length;
const m = getPaymentMethod(T.payment);

function Save() {
  return (
    <Button variant="primary" fullWidth className="bg-gt-success text-gt-ink!">
      <PixelIcon name="scan-success" size={18} /> Guardar Transacción
    </Button>
  );
}

// A · "Pagado con" row above the total (current).
function OptionA() {
  return (
    <div className="flex w-80 flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Pagado con</span>
        <PaymentChip method={m} />
      </div>
      <div className="flex items-center justify-between rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg-3 px-4 py-3">
        <span className="text-gt-sm font-extrabold text-gt-ink-3">Total ({N} items)</span>
        <span className="font-gt-display text-gt-2xl font-extrabold text-gt-primary">{clp(T.total)}</span>
      </div>
      <Save />
    </div>
  );
}

// B · Payment inline inside the total bar (left), total right.
function OptionB() {
  return (
    <div className="flex w-80 flex-col gap-3">
      <div className="flex items-center justify-between gap-2 rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg-3 px-3 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Total · {N} items</span>
          <PaymentChip method={m} size="sm" />
        </div>
        <span className="font-gt-display text-gt-3xl font-extrabold text-gt-primary">{clp(T.total)}</span>
      </div>
      <Save />
    </div>
  );
}

// C · Total folded into the CTA (amount on the button), payment chip above.
function OptionC() {
  return (
    <div className="flex w-80 flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Pagado con</span>
        <PaymentChip method={m} />
      </div>
      <Button variant="primary" fullWidth className="bg-gt-success text-gt-ink! justify-between px-4">
        <span className="flex items-center gap-2"><PixelIcon name="scan-success" size={18} /> Guardar</span>
        <span className="font-gt-display text-gt-xl">{clp(T.total)}</span>
      </Button>
    </div>
  );
}

// D · Three-up summary bar: count · payment · total, then CTA.
function OptionD() {
  return (
    <div className="flex w-80 flex-col gap-3">
      <div className="flex items-stretch divide-x-2 divide-gt-line rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface">
        <div className="flex flex-1 flex-col items-center gap-0.5 py-2.5">
          <span className="text-gt-2xl font-extrabold text-gt-ink">{N}</span>
          <span className="text-gt-xs font-bold text-gt-ink-3">ítems</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 py-2.5">
          <PaymentChip method={m} size="sm" />
          <span className="text-gt-xs font-bold text-gt-ink-3">pago</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-0.5 py-2.5">
          <span className="font-gt-display text-gt-xl font-extrabold text-gt-primary">{clp(T.total)}</span>
          <span className="text-gt-xs font-bold text-gt-ink-3">total</span>
        </div>
      </div>
      <Save />
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Pagado con row (current)", note: "Payment row above a bordered total bar, then the save CTA. Clear and conventional.", render: () => <OptionA /> },
  { id: "B", label: "Payment in total bar", note: "Payment chip lives inside the total bar (left), total figure right. One block.", render: () => <OptionB /> },
  { id: "C", label: "Amount on CTA", note: "Total folded into the save button; payment chip above. Fewest rows.", render: () => <OptionC /> },
  { id: "D", label: "Three-up summary", note: "count · payment · total as a divided summary bar, then CTA. Most scannable.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Txn · Total Footer",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Total footer — payment · total · save" intro="Where payment sits relative to the total + CTA." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
