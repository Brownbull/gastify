import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { MapPinIcon } from "@design-system/assets/icons";
import { AttachTile } from "@design-system/atoms/AttachTile";
import { MetaPill } from "@design-system/atoms/MetaPill";
import { Card } from "@design-system/molecules/Card";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { MerchantHeader } from "@design-system/molecules/MerchantHeader";
import { PaymentChip } from "@design-system/molecules/PaymentChip";
import { getCategoryToken } from "@lib/categoryTokens";
import { sampleTxn as T } from "@lib/transactionFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Merchant header: the transaction-detail top block. All show the same
 * info (name · category · location · date · time · payment · attach); they
 * differ in layout, density, and where payment sits.
 */

// A · Spacious card — outlined MetaPills, payment in the pill row, attach tile.
function OptionA() {
  return (
    <Card padded={false} className="w-80 p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 truncate text-gt-2xl font-extrabold text-gt-ink">{T.merchant}</h2>
            <PixelIcon name="action-edit" size={14} className="shrink-0 opacity-40" />
          </div>
          <CategoryChip category={T.category} size="sm" />
          <MetaPill icon={<MapPinIcon className="h-3.5 w-3.5" />}>{T.location}</MetaPill>
          <div className="flex flex-wrap items-center gap-2">
            <MetaPill icon={<PixelIcon name="chart-calendar" size={14} />}>{T.date}</MetaPill>
            <MetaPill>{T.time}</MetaPill>
            <PaymentChip method={T.payment} size="sm" />
          </div>
        </div>
        <AttachTile />
      </div>
    </Card>
  );
}

// B · Compact (the picked one) — the MerchantHeader molecule itself.
function OptionB() {
  return (
    <div className="w-80">
      <MerchantHeader txn={T} />
    </div>
  );
}

// C · Category banner — tinted band, payment + metadata in a sub-bar.
function OptionC() {
  const tk = getCategoryToken(T.category);
  return (
    <div className="w-80 overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong shadow-gt-md">
      <div className="flex items-center gap-3 p-3" style={{ backgroundColor: tk.tint }}>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <h2 className="min-w-0 truncate text-gt-xl font-extrabold text-gt-ink">{T.merchant}</h2>
            <PixelIcon name="action-edit" size={13} className="shrink-0 opacity-40" />
          </div>
          <span className="flex items-center gap-1.5">
            <PixelIcon name={tk.icon} size={16} />
            <span className="text-gt-md font-extrabold" style={{ color: tk.color }}>{tk.label}</span>
          </span>
        </div>
        <AttachTile shape="square" />
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t-2 border-gt-line bg-gt-surface px-3 py-2.5 text-gt-sm font-bold text-gt-ink-3">
        <span className="flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5" />{T.location}</span>
        <span className="text-gt-line-strong">·</span>
        <span className="flex items-center gap-1"><PixelIcon name="chart-calendar" size={13} />{T.date}</span>
        <span className="text-gt-line-strong">·</span>
        <span>{T.time}</span>
        <span className="flex-1" />
        <PaymentChip method={T.payment} size="sm" />
      </div>
    </div>
  );
}

// D · Editorial — Baloo hero title, underline metadata fields, square attach.
function OptionD() {
  return (
    <Card padded={false} className="w-80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="border-b-2 border-gt-line-strong pb-1">
            <h2 className="truncate font-gt-display text-gt-3xl font-extrabold leading-tight text-gt-ink">{T.merchant}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <CategoryChip category={T.category} />
            <PaymentChip method={T.payment} size="sm" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 border-b-2 border-gt-line pb-1.5">
              <MapPinIcon className="h-4 w-4 text-gt-ink-3" />
              <span className="text-gt-md font-semibold text-gt-ink">{T.location}</span>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 border-b-2 border-gt-line pb-1.5">
                <PixelIcon name="chart-calendar" size={16} />
                <span className="text-gt-md font-semibold text-gt-ink">{T.date}</span>
              </div>
              <div className="flex items-center gap-2 border-b-2 border-gt-line pb-1.5">
                <span className="text-gt-md font-semibold text-gt-ink">{T.time}</span>
              </div>
            </div>
          </div>
        </div>
        <AttachTile shape="square" />
      </div>
    </Card>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Spacious card", note: "Card-wrapped, outlined MetaPills, payment in the pill row, receipt attach tile. Roomiest.", render: () => <OptionA /> },
  { id: "B", label: "Compact (picked)", note: "The MerchantHeader molecule: ThumbnailBadge + inline category/payment + one-line metadata. Densest header.", render: () => <OptionB /> },
  { id: "C", label: "Category banner", note: "Category-tinted band; metadata + payment in a sub-bar. Strong per-type identity.", render: () => <OptionC /> },
  { id: "D", label: "Editorial", note: "Baloo hero title + underline metadata fields. Form-like, calm.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Txn · Merchant Header",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Merchant header — layout & density" intro="Same info (name · category · location · date · time · payment · attach); different layout/density and payment placement." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
