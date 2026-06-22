import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Card } from "@design-system/molecules/Card";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { getCategoryToken } from "@lib/categoryTokens";
import { clp, sampleItems } from "@lib/transactionFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Item row: how a single receipt line distributes the FIVE required
 * fields (name · total price · unit price · units · category). Pick the
 * arrangement + density, then fold into the ItemRow molecule.
 */
const ITEMS = sampleItems;

// A · Two-line (current ItemRow): name + total / chip + "unit ×qty". Tight.
function OptionA() {
  return (
    <Card padded={false} className="w-80">
      <ul className="divide-y-2 divide-gt-line">
        {ITEMS.map((it) => (
          <li key={it.name} className="flex flex-col gap-1 px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 truncate text-gt-sm font-bold text-gt-ink">{it.name}</span>
              <span className="shrink-0 text-gt-sm font-extrabold text-gt-ink">{clp(it.total)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <CategoryChip category={it.category} size="sm" />
              <span className="shrink-0 text-gt-xs font-bold text-gt-ink-3">{clp(it.unitPrice)} ×{it.units}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// B · Single-line dense: name · chip · qty·unit · total, all in one row.
function OptionB() {
  return (
    <Card padded={false} className="w-80">
      <ul className="divide-y-2 divide-gt-line">
        {ITEMS.map((it) => (
          <li key={it.name} className="flex items-center gap-2 px-2.5 py-2">
            <span className="min-w-0 flex-1 truncate text-gt-sm font-bold text-gt-ink">{it.name}</span>
            <CategoryChip category={it.category} size="sm" />
            <span className="shrink-0 text-gt-xs font-bold text-gt-ink-3">×{it.units}</span>
            <span className="shrink-0 text-gt-sm font-extrabold text-gt-ink">{clp(it.total)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// C · Qty pill leading: a units pill leads, then name + chip, total trails.
function OptionC() {
  return (
    <Card padded={false} className="w-80">
      <ul className="divide-y-2 divide-gt-line">
        {ITEMS.map((it) => (
          <li key={it.name} className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-gt-md border-2 border-gt-line-strong bg-gt-bg-3 text-gt-xs font-extrabold text-gt-ink">
              ×{it.units}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-gt-sm font-bold text-gt-ink">{it.name}</span>
              <CategoryChip category={it.category} size="sm" />
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-gt-sm font-extrabold text-gt-ink">{clp(it.total)}</span>
              <span className="text-gt-xs font-bold text-gt-ink-3">{clp(it.unitPrice)} c/u</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// D · Category accent bar: colored left edge = category, name + total prominent,
//     unit/qty/category-name in the category color on line 2.
function OptionD() {
  return (
    <Card padded={false} className="w-80 p-2">
      <ul className="flex flex-col gap-1.5">
        {ITEMS.map((it) => {
          const tk = getCategoryToken(it.category);
          return (
            <li
              key={it.name}
              className="flex items-center gap-2.5 rounded-gt-lg border-l-[5px] bg-gt-bg-3 py-2 pl-2.5 pr-2.5"
              style={{ borderLeftColor: tk.color }}
            >
              <PixelIcon name={tk.icon} size={20} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-gt-sm font-bold text-gt-ink">{it.name}</span>
                <span className="text-gt-xs font-bold" style={{ color: tk.color }}>
                  {tk.label} · {clp(it.unitPrice)} ×{it.units}
                </span>
              </span>
              <span className="shrink-0 text-gt-sm font-extrabold text-gt-ink">{clp(it.total)}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Two-line (current)", note: "name + total (line 1) · CategoryChip + '$unit ×qty' (line 2). Legacy density. All 5 fields, comfortable scan.", render: () => <OptionA /> },
  { id: "B", label: "Single-line dense", note: "Everything on one line: name · chip · ×qty · total. Highest density; drops the explicit unit price (only qty).", render: () => <OptionB /> },
  { id: "C", label: "Qty pill + stacked price", note: "Units pill leads; total + '$unit c/u' stack on the right. Emphasizes quantity.", render: () => <OptionC /> },
  { id: "D", label: "Category accent bar", note: "Colored left edge = category, category name + unit + qty in the category color on line 2. Strongest category read.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Txn · Item Row",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Item row — 5-field distribution" intro="name · total · unit price · units · category. Pick the arrangement + density." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
