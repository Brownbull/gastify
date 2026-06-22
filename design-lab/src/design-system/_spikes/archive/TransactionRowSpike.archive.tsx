import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ChevronDownIcon, MapPinIcon } from "@design-system/assets/icons";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { getCategoryToken } from "@lib/categoryTokens";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Transaction row (v2, legacy-inspired). All options share the key
 * pattern from the legacy app: thumbnail with category badge overlay, store
 * name, metadata row (date · location · items), amount, and an expand/collapse
 * chevron that reveals item details.
 *
 * Variations explore density, thumbnail shape, category badge placement, and
 * expand treatment.
 */
interface Txn {
  store: string;
  storeIcon: string;
  category: string;
  thumbnail: string;
  date: string;
  location: string;
  items: number;
  amount: string;
  firstItem?: { name: string; qty: number; price: string };
}

const TXNS: Txn[] = [
  {
    store: "Amazon",
    storeIcon: "store-online",
    category: "tiendas-generales",
    thumbnail: "item-apparel",
    date: "06/02/2026, 15:12",
    location: "Villarrica",
    items: 3,
    amount: "$199.87",
    firstItem: { name: "Polera algodón talla M", qty: 1, price: "$45.990" },
  },
  {
    store: "Rukapillan Libros Limitada",
    storeIcon: "store-bookstore",
    category: "tiendas-especializadas",
    thumbnail: "item-books-media",
    date: "23/01/2026, 18:58",
    location: "Villarrica",
    items: 1,
    amount: "$21.000",
    firstItem: { name: "Cien años de soledad", qty: 1, price: "$21.000" },
  },
  {
    store: "Quetrupillan adornos",
    storeIcon: "store-home-goods",
    category: "comercio-barrio",
    thumbnail: "item-furnishings",
    date: "23/01/2026, 18:53",
    location: "Villarrica",
    items: 1,
    amount: "$22.000",
    firstItem: { name: "Florero cerámica artesanal", qty: 1, price: "$22.000" },
  },
];

/** Thumbnail with a category circle badge overlaid on the bottom-right. */
function Thumbnail({ txn, size = "md" }: { txn: Txn; size?: "sm" | "md" }) {
  const token = getCategoryToken(txn.category);
  const dim = size === "sm" ? "h-12 w-12" : "h-14 w-14";
  const badgeDim = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const badgeIcon = size === "sm" ? 14 : 16;
  return (
    <span className={`relative ${dim} shrink-0`}>
      <span className={`grid ${dim} place-items-center overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg`}>
        <PixelIcon name={txn.thumbnail} size={size === "sm" ? 32 : 36} />
      </span>
      <span
        className={`absolute -bottom-1 -right-1 grid ${badgeDim} place-items-center rounded-full border-2 border-gt-bg`}
        style={{ backgroundColor: token.color }}
      >
        <PixelIcon name={token.icon} size={badgeIcon} />
      </span>
    </span>
  );
}

/** Meta line: date · location · N items */
function MetaLine({ txn }: { txn: Txn }) {
  return (
    <span className="flex flex-wrap items-center gap-1 text-gt-xs font-bold text-gt-ink-3">
      <PixelIcon name="chart-calendar" size={12} />
      <span>{txn.date}</span>
      <span className="text-gt-line-strong">·</span>
      <MapPinIcon className="h-3 w-3" />
      <span>{txn.location}</span>
      <span className="text-gt-line-strong">·</span>
      <PixelIcon name="fin-receipt" size={12} />
      <span>{txn.items}</span>
    </span>
  );
}

/** Expand/collapse chevron button. */
function ExpandButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={expanded ? "Contraer" : "Expandir"}
      aria-expanded={expanded}
      onClick={onToggle}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-gt-md text-gt-ink-3 transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/20"
    >
      <ChevronDownIcon className={`h-4 w-4 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} />
    </button>
  );
}

/** Expanded detail panel showing first item + "Ver más" link. */
function DetailPanel({ txn }: { txn: Txn }) {
  if (!txn.firstItem) return null;
  return (
    <div className="flex items-center gap-3 rounded-gt-lg bg-gt-bg-3 px-3 py-2">
      <PixelIcon name={txn.thumbnail} size={24} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-gt-sm font-bold text-gt-ink">{txn.firstItem.name}</span>
        <span className="text-gt-xs font-semibold text-gt-ink-3">{txn.firstItem.qty}× · {txn.firstItem.price}</span>
      </div>
      <button type="button" className="text-gt-sm font-extrabold text-gt-primary hover:underline">Ver más</button>
    </div>
  );
}

/** Stateful wrapper that manages expand/collapse per transaction. */
function ExpandableList({ children }: { children: (expanded: Set<string>, toggle: (id: string) => void) => ReactNode }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return <>{children(expanded, toggle)}</>;
}

// ── Option A: Card rows with thumbnail badge ──────────────────────────────
// Each transaction is a bordered card. Thumbnail left with category badge,
// store + meta center, amount + chevron right. Expand reveals detail inside.
function OptionA() {
  return (
    <ExpandableList>
      {(expanded, toggle) => (
        <div className="flex w-80 flex-col gap-2.5">
          {TXNS.map((t) => (
            <div key={t.store} className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
              <div className="flex items-center gap-3 p-3">
                <Thumbnail txn={t} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-gt-md font-extrabold text-gt-ink">{t.store}</span>
                  <MetaLine txn={t} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{t.amount}</span>
                  <ExpandButton expanded={expanded.has(t.store)} onToggle={() => toggle(t.store)} />
                </div>
              </div>
              {expanded.has(t.store) ? (
                <div className="border-t-2 border-gt-line px-3 pb-3">
                  <DetailPanel txn={t} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </ExpandableList>
  );
}

// ── Option B: Divided list rows (denser, single card) ─────────────────────
// All transactions in one card, divided. Compact — closer to the legacy list
// density. Thumbnail + badge smaller.
function OptionB() {
  return (
    <ExpandableList>
      {(expanded, toggle) => (
        <div className="w-80 overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md">
          <ul className="flex flex-col divide-y-2 divide-gt-line">
            {TXNS.map((t) => (
              <li key={t.store}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <Thumbnail txn={t} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-gt-md font-extrabold text-gt-ink">{t.store}</span>
                    <MetaLine txn={t} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t.amount}</span>
                    <ExpandButton expanded={expanded.has(t.store)} onToggle={() => toggle(t.store)} />
                  </div>
                </div>
                {expanded.has(t.store) ? (
                  <div className="px-3 pb-2.5">
                    <DetailPanel txn={t} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ExpandableList>
  );
}

// ── Option C: Badge overlay + category chip in meta ───────────────────────
// Same card-per-row as A, but also shows a CategoryChip in the meta line for
// explicit category labeling alongside the visual badge.
function OptionC() {
  return (
    <ExpandableList>
      {(expanded, toggle) => (
        <div className="flex w-80 flex-col gap-2.5">
          {TXNS.map((t) => (
            <div key={t.store} className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
              <div className="flex items-center gap-3 p-3">
                <Thumbnail txn={t} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-gt-md font-extrabold text-gt-ink">{t.store}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryChip category={t.category} size="sm" />
                    <span className="text-gt-xs font-bold text-gt-ink-3">{t.date}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{t.amount}</span>
                  <ExpandButton expanded={expanded.has(t.store)} onToggle={() => toggle(t.store)} />
                </div>
              </div>
              {expanded.has(t.store) ? (
                <div className="border-t-2 border-gt-line px-3 pb-3">
                  <DetailPanel txn={t} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </ExpandableList>
  );
}

// ── Option D: Full-width expand with slide-down items list ────────────────
// Divided list like B but expand shows a richer panel: item icon + name +
// qty/price per line, plus the "Ver más" footer. Maximum detail on expand.
function OptionD() {
  return (
    <ExpandableList>
      {(expanded, toggle) => (
        <div className="w-80 overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md">
          <ul className="flex flex-col divide-y-2 divide-gt-line">
            {TXNS.map((t) => {
              const token = getCategoryToken(t.category);
              return (
                <li key={t.store}>
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Thumbnail txn={t} size="sm" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-gt-md font-extrabold text-gt-ink">{t.store}</span>
                      <MetaLine txn={t} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t.amount}</span>
                      <ExpandButton expanded={expanded.has(t.store)} onToggle={() => toggle(t.store)} />
                    </div>
                  </div>
                  {expanded.has(t.store) && t.firstItem ? (
                    <div className="border-t border-gt-line bg-gt-bg px-3 pb-2.5 pt-2">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-4 w-1 rounded-full" style={{ backgroundColor: token.color }} />
                        <span className="text-gt-xs font-extrabold uppercase tracking-wide" style={{ color: token.color }}>{token.label}</span>
                      </div>
                      <div className="flex items-center gap-3 rounded-gt-lg bg-gt-surface px-3 py-2">
                        <PixelIcon name={t.thumbnail} size={28} />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-gt-sm font-bold text-gt-ink">{t.firstItem.name}</span>
                          <span className="text-gt-xs font-semibold text-gt-ink-3">{t.firstItem.qty}× · {t.firstItem.price}</span>
                        </div>
                      </div>
                      {t.items > 1 ? (
                        <button type="button" className="mt-1.5 text-gt-sm font-extrabold text-gt-primary hover:underline">
                          Ver {t.items - 1} más →
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ExpandableList>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Card rows + badge", note: "Each transaction a bordered card. Thumbnail with category badge overlay, store + meta, amount + chevron. Expand inside card.", render: () => <OptionA /> },
  { id: "B", label: "Divided list (dense)", note: "All transactions in one card, divided rows. Smaller thumbnail. Closest to legacy density.", render: () => <OptionB /> },
  { id: "C", label: "Badge + category chip", note: "Card-per-row like A, but adds a CategoryChip in the meta line for explicit text labeling alongside the visual badge.", render: () => <OptionC /> },
  { id: "D", label: "Rich expand panel", note: "Divided list like B, but expand shows a richer panel: category color bar + item detail rows + 'Ver N más' link.", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/Transaction Row",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike title="Transaction row — legacy-inspired" intro="Thumbnail with category badge overlay, expandable item details, store + date/location/items meta. Pick density + expand treatment." options={OPTIONS} {...args} />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {};
