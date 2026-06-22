import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ChevronDownIcon } from "@design-system/assets/icons";
import { Badge } from "@design-system/atoms/Badge";
import { Card } from "@design-system/molecules/Card";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { getCategoryToken } from "@lib/categoryTokens";
import { clp, sampleTxn, type TxnGroup } from "@lib/transactionFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Item group header: how a "Por Grupo" group card presents its familia
 * (L3) header — tint treatment, where the subtotal/count sit, collapse
 * affordance. Body rows are a fixed simple list so focus stays on the header.
 */
const GROUPS = sampleTxn.groups;

function Rows({ group }: { group: TxnGroup }) {
  return (
    <ul className="divide-y-2 divide-gt-line">
      {group.items.map((it) => (
        <li key={it.name} className="flex items-center justify-between gap-2 px-2.5 py-2">
          <span className="min-w-0 flex-1 truncate text-gt-sm font-bold text-gt-ink">{it.name}</span>
          <CategoryChip category={it.category} size="sm" />
          <span className="shrink-0 text-gt-sm font-extrabold text-gt-ink">{clp(it.total)}</span>
        </li>
      ))}
    </ul>
  );
}

function useOpen() {
  const [open, setOpen] = useState(true);
  return { open, toggle: () => setOpen((p) => !p) };
}

// A · Tinted header band (current): familia tint fills the header row.
function GroupA({ group }: { group: TxnGroup }) {
  const { open, toggle } = useOpen();
  const tk = getCategoryToken(group.familia);
  const total = group.items.reduce((s, i) => s + i.total, 0);
  return (
    <Card padded={false} className="overflow-hidden">
      <button type="button" onClick={toggle} className="flex w-full items-center gap-2 px-3 py-2.5" style={{ backgroundColor: tk.tint }}>
        <PixelIcon name={tk.icon} size={18} />
        <span className="flex-1 truncate text-gt-md font-extrabold text-gt-ink">{tk.label}</span>
        <Badge tone="neutral">{group.items.length}</Badge>
        <span className="text-gt-md font-extrabold text-gt-primary">{clp(total)}</span>
        <ChevronDownIcon className={`h-4 w-4 text-gt-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <Rows group={group} /> : null}
    </Card>
  );
}

// B · Accent-bar header: white header + thick category-colored left edge.
function GroupB({ group }: { group: TxnGroup }) {
  const { open, toggle } = useOpen();
  const tk = getCategoryToken(group.familia);
  const total = group.items.reduce((s, i) => s + i.total, 0);
  return (
    <Card padded={false} className="overflow-hidden border-l-[6px]" >
      <div style={{ borderLeftColor: tk.color }} className="-ml-[6px] border-l-[6px]">
        <button type="button" onClick={toggle} className="flex w-full items-center gap-2 bg-gt-surface px-3 py-2.5">
          <PixelIcon name={tk.icon} size={18} />
          <span className="flex-1 truncate text-gt-md font-extrabold text-gt-ink">{tk.label}</span>
          <Badge tone="neutral">{group.items.length}</Badge>
          <span className="text-gt-md font-extrabold" style={{ color: tk.color }}>{clp(total)}</span>
          <ChevronDownIcon className={`h-4 w-4 text-gt-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open ? <Rows group={group} /> : null}
      </div>
    </Card>
  );
}

// C · Chip header: familia shown as a solid CategoryChip, subtotal on the right.
function GroupC({ group }: { group: TxnGroup }) {
  const { open, toggle } = useOpen();
  const total = group.items.reduce((s, i) => s + i.total, 0);
  return (
    <Card padded={false} className="overflow-hidden">
      <button type="button" onClick={toggle} className="flex w-full items-center gap-2 bg-gt-bg-3 px-3 py-2.5">
        <CategoryChip category={group.familia} variant="solid" size="sm" />
        <span className="flex-1" />
        <Badge tone="neutral">{group.items.length} ítems</Badge>
        <span className="text-gt-md font-extrabold text-gt-primary">{clp(total)}</span>
        <ChevronDownIcon className={`h-4 w-4 text-gt-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <Rows group={group} /> : null}
    </Card>
  );
}

// D · Two-line header: familia + chevron on line 1, count + subtotal on line 2.
function GroupD({ group }: { group: TxnGroup }) {
  const { open, toggle } = useOpen();
  const tk = getCategoryToken(group.familia);
  const total = group.items.reduce((s, i) => s + i.total, 0);
  return (
    <Card padded={false} className="overflow-hidden">
      <button type="button" onClick={toggle} className="flex w-full flex-col gap-1 px-3 py-2.5" style={{ backgroundColor: tk.tint }}>
        <span className="flex w-full items-center gap-2">
          <PixelIcon name={tk.icon} size={18} />
          <span className="flex-1 truncate text-left text-gt-md font-extrabold text-gt-ink">{tk.label}</span>
          <ChevronDownIcon className={`h-4 w-4 text-gt-ink-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
        <span className="flex w-full items-center gap-2 pl-7 text-gt-xs font-bold text-gt-ink-3">
          {group.items.length} ítems
          <span className="flex-1" />
          <span className="text-gt-md font-extrabold text-gt-primary">{clp(total)}</span>
        </span>
      </button>
      {open ? <Rows group={group} /> : null}
    </Card>
  );
}

function Grid({ Comp }: { Comp: (p: { group: TxnGroup }) => React.ReactNode }) {
  return (
    <div className="flex w-80 flex-col gap-3">
      {GROUPS.map((g) => (
        <Comp key={g.familia} group={g} />
      ))}
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Tinted band (current)", note: "Familia tint fills the header row. Icon + label + count Badge + subtotal + chevron.", render: () => <Grid Comp={GroupA} /> },
  { id: "B", label: "Accent-bar header", note: "White header + thick category-colored left edge; subtotal in the category color. Calmer.", render: () => <Grid Comp={GroupB} /> },
  { id: "C", label: "Solid chip header", note: "Familia shown as a solid CategoryChip on a neutral bar; count + subtotal trail.", render: () => <Grid Comp={GroupC} /> },
  { id: "D", label: "Two-line header", note: "Familia + chevron on line 1; count + subtotal on line 2. Roomier for long familia names.", render: () => <Grid Comp={GroupD} /> },
];

const meta = {
  title: "Design System/Spikes/Txn · Item Group",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Item group — header treatment" intro="How a Por-Grupo group presents its L3 familia header (tint, subtotal, count, collapse)." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
