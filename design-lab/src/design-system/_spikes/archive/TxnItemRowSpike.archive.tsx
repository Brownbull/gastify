import type { Meta, StoryObj } from "@storybook/react-vite";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { clp, sampleItems } from "@lib/transactionFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — TRANSACTION item row (DM-17, Layout 1, MERGED A+B per user). NO icon
 * (scanned items rarely map). Structure (decided): left = title + a content-
 * width category chip under it; right = numbers stacked (TOTAL on top, then
 * "$unit ×qty"). A is the decided layout; B/C are density/format variants to
 * confirm.
 */
const ITEMS = sampleItems;

function CardOfRows({ children }: { children: React.ReactNode }) {
  return <ul className="w-80 divide-y divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">{children}</ul>;
}

// A · DECIDED — title + chip-under-title (content width) left; total / "$unit ×qty" stacked right
function OptionA() {
  return (
    <CardOfRows>
      {ITEMS.map((it) => (
        <li key={it.name} className="flex items-center gap-gt-8 p-gt-10">
          <span className="flex min-w-0 flex-1 flex-col items-start gap-gt-4">
            <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{it.name}</span>
            <CategoryChip category={it.category} size="sm" />
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(it.total)}</span>
            <span className="text-gt-xs font-medium text-gt-ink-2">{clp(it.unitPrice)} ×{it.units}</span>
          </span>
        </li>
      ))}
    </CardOfRows>
  );
}

// B · same, but unit line reads "×qty · $unit c/u" (qty first)
function OptionB() {
  return (
    <CardOfRows>
      {ITEMS.map((it) => (
        <li key={it.name} className="flex items-center gap-gt-8 p-gt-10">
          <span className="flex min-w-0 flex-1 flex-col items-start gap-gt-4">
            <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{it.name}</span>
            <CategoryChip category={it.category} size="sm" />
          </span>
          <span className="flex shrink-0 flex-col items-end">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(it.total)}</span>
            <span className="text-gt-xs font-medium text-gt-ink-2">×{it.units} · {clp(it.unitPrice)} c/u</span>
          </span>
        </li>
      ))}
    </CardOfRows>
  );
}

// C · comfortable — bigger total (lg), more vertical room
function OptionC() {
  return (
    <CardOfRows>
      {ITEMS.map((it) => (
        <li key={it.name} className="flex items-center gap-gt-8 p-gt-12">
          <span className="flex min-w-0 flex-1 flex-col items-start gap-gt-4">
            <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{it.name}</span>
            <CategoryChip category={it.category} size="sm" />
          </span>
          <span className="flex shrink-0 flex-col items-end gap-gt-2">
            <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{clp(it.total)}</span>
            <span className="text-gt-xs font-medium text-gt-ink-2">{clp(it.unitPrice)} ×{it.units}</span>
          </span>
        </li>
      ))}
    </CardOfRows>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Decided (A+B merge)", note: "Title + content-width category chip under it (left); TOTAL over '$unit ×qty' stacked (right). The merged layout you described.", render: () => <OptionA /> },
  { id: "B", label: "Qty-first unit line", note: "Same, but the unit line reads '×qty · $unit c/u'. Confirm which unit format reads better.", render: () => <OptionB /> },
  { id: "C", label: "Comfortable (big total)", note: "Same layout, larger total + roomier padding. Confirm density.", render: () => <OptionC /> },
];

const meta = {
  title: "Design System/Spikes/Item Row · Transaction",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Transaction item row — merged A+B (Layout 1)" intro="No icon. Title + content-width category chip (left); total over '$unit ×qty' stacked (right). A = decided; B/C confirm unit format + density." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
