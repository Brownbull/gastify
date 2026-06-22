import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ChevronDownIcon } from "@design-system/assets/icons";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { CompactRow, CompactRowList } from "@design-system/molecules/CompactRowList";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import { clp, sampleHistoryItems, type HistoryItem, type HistoryPurchase } from "@lib/transactionFixtures";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — ITEMS-HISTORY row (DM-17, Layout 2, refined DM-17d). Same layout as
 * the transaction item row (NO left icon). Structure:
 *   [ name (+ purple Gustify chip if mapped) ] [ total spent · countPill ]
 *   [ category chip ]
 * The purple Gustify chip sits inline AFTER the name, icon-only, ONLY for items
 * mapped to a Gustify ingredient/prepared-food (the cross-app link). countPill =
 * ONE pill (receipt icon + txn count + chevron). Tapping it expands the receipts
 * containing this item as FULL-WIDTH CompactRows, capped 5, + inset "Ver todo".
 */
const ITEMS = sampleHistoryItems;
const CAP = 5;

function CardOfRows({ children }: { children: React.ReactNode }) {
  return <ul className="w-80 divide-y divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">{children}</ul>;
}

/** Expanded receipts for one item — FULL-WIDTH CompactRows + inset "Ver todo". */
function PurchaseList({ item }: { item: HistoryItem }) {
  const shown = item.purchases.slice(0, CAP);
  const more = item.purchases.length - shown.length;
  return (
    <div className="bg-gt-bg-3 pb-gt-8 pt-gt-2">
      {/* full-width rows: no horizontal padding on the wrapper, top divider */}
      <CompactRowList className="border-t-2 border-gt-line">
        {shown.map((p: HistoryPurchase, i) => (
          <CompactRow
            key={i}
            leading={<ThumbnailBadge icon={p.storeIcon} category={p.storeCategory} size="sm" />}
            title={p.store}
            meta={
              <span className="flex items-center gap-gt-4 text-gt-xs font-medium text-gt-ink-2">
                <PixelIcon name="chart-calendar" size={12} />
                {p.date} · ×{p.qty} · {clp(p.unitPrice)} c/u
              </span>
            }
            trailing={<span className="font-gt-display text-gt-sm font-extrabold text-gt-ink">{clp(p.lineTotal)}</span>}
          />
        ))}
      </CompactRowList>
      {/* the button stays inset (padding around it); rows above are full-width */}
      <div className="px-gt-8 pt-gt-8">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-gt-4 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-8 text-gt-sm font-extrabold text-gt-primary shadow-gt-xs transition hover:-translate-y-0.5 hover:shadow-gt-sm"
        >
          Ver todo{more > 0 ? ` (${more} más)` : ""} →
        </button>
      </div>
    </div>
  );
}

/** The purple Gustify-link chip — icon-only, only when the item is mapped. The
 *  icon fills close to the pill border (overflow-hidden clips it) WITHOUT growing
 *  the fixed h-6 pill. */
function GustifyChip({ icon }: { icon: string }) {
  return (
    <span
      className="inline-grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary shadow-gt-xs"
      title="Vinculado con Gustify"
    >
      <PixelIcon name={icon} dir="gustify-icons" size={20} alt="Vinculado con Gustify" />
    </span>
  );
}

function Row({ item }: { item: HistoryItem }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <div className="flex items-center gap-gt-8 p-gt-10">
        <span className="flex min-w-0 flex-1 flex-col items-start gap-gt-4">
          <span className="flex min-w-0 items-center gap-gt-6">
            <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{item.name}</span>
            {item.gustifyIcon ? <GustifyChip icon={item.gustifyIcon} /> : null}
          </span>
          <CategoryChip category={item.category} size="sm" />
        </span>
        <span className="flex shrink-0 flex-col items-end gap-gt-4">
          <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(item.totalSpent)}</span>
          {/* count pill: receipt icon + N + chevron, all in one bordered pill */}
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            aria-expanded={open}
            aria-label={`${item.txnCount} compras — ver`}
            // bigger icons (18px), pill height held by reduced py-gt-0 + the icon
            // sitting against the border (gap kept tight).
            className="inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-8 py-gt-0 text-gt-xs font-extrabold text-gt-ink shadow-gt-xs transition hover:-translate-y-0.5 hover:shadow-gt-sm"
          >
            <PixelIcon name="fin-receipt" size={18} />
            {item.txnCount}
            <ChevronDownIcon className={`h-4 w-4 text-gt-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
          </button>
        </span>
      </div>
      {open ? <PurchaseList item={item} /> : null}
    </li>
  );
}

function Grid() {
  return (
    <CardOfRows>
      {ITEMS.map((it) => (
        <Row key={it.name} item={it} />
      ))}
    </CardOfRows>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Decided", note: "No left icon. name (+ purple Gustify chip if mapped) · category chip; total spent / count-pill (📄 N ▾) on the right. Tapping the pill expands the receipts — full-width CompactRows, capped 5, then inset 'Ver todo'. (Café molido = NOT mapped → no Gustify chip.)", render: () => <Grid /> },
];

const meta = {
  title: "Design System/Spikes/Item Row · History",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "A", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Items-history row — Gustify link (Layout 2)" intro="Like the txn row (no left icon) + a purple Gustify chip after the name (icon-only, ONLY for items mapped to Gustify). total spent / count-pill on the right; tap to expand the receipts." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
