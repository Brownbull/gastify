import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ChevronDownIcon, MapPinIcon } from "@design-system/assets/icons";
import { Badge } from "@design-system/atoms/Badge";
import { Button } from "@design-system/atoms/Button";
import { Card } from "@design-system/molecules/Card";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { PaymentChip } from "@design-system/molecules/PaymentChip";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import { getCategoryToken } from "@lib/categoryTokens";
import { getPaymentMethod } from "@lib/paymentMethods";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Transaction detail (v3, legacy-faithful). Recreated from the BoletApp
 * EditView layout: same spacing (legacy 4px scale maps 1:1 — card p-3, gap-2
 * vertical rhythm, header divider mb-4 pb-4, group cards gap-3, item rows
 * px-2.5 py-2), same information density, re-skinned in Playful Geometric
 * grammar (2px ink borders + hard shadows instead of 1px soft + soft shadows).
 *
 * REQUIRED data shown: establishment name · category · day placed · amount; and
 * per item: NAME · TOTAL PRICE · UNIT PRICE · UNITS · CATEGORY (two-line row —
 * line 1: name + total; line 2: CategoryChip + "$unitPrice ×units").
 *
 * NEW (DM-8): the relational payment indicator (PaymentChip — cash coin or card
 * swatch+nickname). Options A/B place it in the header; C/D place it near the
 * total ("Pagado con"). Variations also differ on INFORMATION DENSITY.
 */

// ── Mock data ───────────────────────────────────────────────────────────
interface Item {
  name: string;
  total: number;
  unitPrice: number;
  units: number;
  /** L4 category id for the per-item CategoryChip. */
  category: string;
}
interface Group {
  familia: string; // L3 id
  items: Item[];
}
const TXN = {
  merchant: "Nido Gastronómico",
  category: "restaurantes", // L1 store category
  storeIcon: "store-restaurant",
  location: "Villarrica, Chile",
  date: "17 Mar 2026",
  time: "17:10",
  payment: "falabella",
  total: 11500,
  groups: [
    {
      familia: "food-fresh",
      items: [
        { name: "Pan amasado", total: 4800, unitPrice: 1600, units: 3, category: "BreadPastry" },
        { name: "Mantequilla", total: 4864, unitPrice: 2432, units: 2, category: "DairyEggs" },
      ],
    },
    {
      familia: "servicios-cargos",
      items: [
        { name: "Iva (19%)", total: 1836, unitPrice: 1836, units: 1, category: "TaxFees" },
        { name: "Propina", total: 0, unitPrice: 0, units: 1, category: "ServiceCharge" },
      ],
    },
  ] as Group[],
};
const allItems = TXN.groups.flatMap((g) => g.items);
const itemCount = allItems.length;

function fmt(n: number) {
  return `$${n.toLocaleString("es-CL")}`;
}

// ── Item row (legacy two-line; carries all 5 fields) ────────────────────
// density: "tight" = legacy 12px; "comfortable" = 14px.
function ItemRow({ item, index, density }: { item: Item; index?: number; density: "tight" | "comfortable" }) {
  const nameSize = density === "tight" ? "text-gt-sm" : "text-gt-md";
  const priceSize = density === "tight" ? "text-gt-sm" : "text-gt-md";
  const pad = density === "tight" ? "px-2.5 py-2" : "px-3 py-2.5";
  return (
    <li className={`flex items-start gap-2.5 ${pad}`}>
      {index != null ? (
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-gt-md border-2 border-gt-line-strong bg-gt-bg-3 text-gt-xs font-extrabold text-gt-ink-3">
          {index}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* line 1: name + total price */}
        <div className="flex items-start justify-between gap-2">
          <span className={`min-w-0 truncate font-bold text-gt-ink ${nameSize}`}>{item.name}</span>
          <span className={`shrink-0 font-extrabold text-gt-ink ${priceSize}`}>{fmt(item.total)}</span>
        </div>
        {/* line 2: category chip + unit price × units */}
        <div className="flex items-center justify-between gap-2">
          <CategoryChip category={item.category} size="sm" />
          <span className="shrink-0 text-gt-xs font-bold text-gt-ink-3">
            {fmt(item.unitPrice)} ×{item.units}
          </span>
        </div>
      </div>
    </li>
  );
}

// ── Grouped view (Card per L3 group, tinted header, divided items) ──────
function GroupSection({ group, density }: { group: Group; density: "tight" | "comfortable" }) {
  const [open, setOpen] = useState(true);
  const token = getCategoryToken(group.familia);
  const total = group.items.reduce((s, i) => s + i.total, 0);
  const headerSize = density === "tight" ? "text-gt-md" : "text-gt-md";
  return (
    <Card padded={false} className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        style={{ backgroundColor: token.tint }}
      >
        <PixelIcon name={token.icon} size={18} />
        <span className={`flex-1 truncate font-extrabold text-gt-ink ${headerSize}`}>{token.label}</span>
        <Badge tone="neutral">{group.items.length}</Badge>
        <span className="text-gt-md font-extrabold text-gt-primary">{fmt(total)}</span>
        <ChevronDownIcon className={`h-4 w-4 text-gt-ink-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <ul className="divide-y-2 divide-gt-line">{group.items.map((it) => <ItemRow key={it.name} item={it} density={density} />)}</ul> : null}
    </Card>
  );
}

// ── Original view (single Card, indexed rows) ───────────────────────────
function OriginalList({ density }: { density: "tight" | "comfortable" }) {
  return (
    <Card padded={false}>
      <ul className="divide-y-2 divide-gt-line">
        {allItems.map((it, i) => <ItemRow key={it.name} item={it} index={i + 1} density={density} />)}
      </ul>
    </Card>
  );
}

function ViewToggle({ mode, onChange }: { mode: "grouped" | "original"; onChange: (m: "grouped" | "original") => void }) {
  return (
    <div role="tablist" className="flex w-full gap-1 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface p-1 shadow-gt-sm">
      {(["grouped", "original"] as const).map((m) => {
        const isActive = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(m)}
            className={`flex-1 rounded-gt-pill py-2 text-gt-md font-extrabold transition duration-150 ease-gt-bounce ${
              isActive ? "bg-gt-accent text-gt-ink shadow-gt-xs" : "text-gt-ink-2 hover:bg-gt-bg-3 hover:text-gt-ink"
            }`}
          >
            {m === "grouped" ? "Por Grupo" : "Original"}
          </button>
        );
      })}
    </div>
  );
}

function ItemsSection({ density }: { density: "tight" | "comfortable" }) {
  const [mode, setMode] = useState<"grouped" | "original">("grouped");
  return (
    <div className="flex flex-col gap-3">
      <ViewToggle mode={mode} onChange={setMode} />
      {mode === "grouped" ? (
        <div className="flex flex-col gap-3">{TXN.groups.map((g) => <GroupSection key={g.familia} group={g} density={density} />)}</div>
      ) : (
        <OriginalList density={density} />
      )}
    </div>
  );
}

function AddItemButton() {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-1.5 rounded-gt-xl border-2 border-dashed border-gt-line-strong py-2.5 text-gt-sm font-extrabold text-gt-primary transition duration-150 hover:bg-gt-primary-soft"
    >
      <PixelIcon name="action-add" size={16} /> Agregar
    </button>
  );
}

function TotalFooter({ withPayment }: { withPayment?: boolean }) {
  const m = getPaymentMethod(TXN.payment);
  return (
    <div className="flex flex-col gap-3">
      {withPayment ? (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Pagado con</span>
          <PaymentChip method={m} />
        </div>
      ) : null}
      <div className="flex items-center justify-between rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg-3 px-4 py-3">
        <span className="text-gt-sm font-extrabold text-gt-ink-3">Total ({itemCount} items)</span>
        <span className="font-gt-display text-gt-2xl font-extrabold text-gt-primary">{fmt(TXN.total)}</span>
      </div>
      <Button variant="primary" fullWidth className="bg-gt-success text-gt-ink!">
        <PixelIcon name="scan-success" size={18} /> Guardar Transacción
      </Button>
    </div>
  );
}

/** Outlined metadata pill (date / time / currency) — legacy outlined tag. */
function MetaPill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-2.5 py-1 text-gt-sm font-extrabold text-gt-ink">
      {icon}
      {children}
    </span>
  );
}

/** Attach-photo dashed tile (legacy 72×90 footprint). */
function AttachTile() {
  return (
    <button
      type="button"
      className="grid h-22.5 w-18 shrink-0 place-items-center gap-1 rounded-gt-lg border-2 border-dashed border-gt-line-strong bg-gt-bg transition duration-150 hover:border-gt-primary hover:bg-gt-primary-soft"
    >
      <PixelIcon name="scan-receipt" size={28} />
      <span className="text-gt-xs font-extrabold text-gt-ink-3">Adjuntar</span>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════
// A · LEGACY-FAITHFUL (TIGHT) — payment in header chips row, 12px item text
// ════════════════════════════════════════════════════════════════════════
function OptionA() {
  return (
    <div className="flex w-80 flex-col gap-4">
      {/* Header card — legacy p-3, gap-4 split, mb-4 pb-4 divider, gap-2 rhythm */}
      <Card padded={false} className="p-3">
        <div className="flex items-start justify-between gap-4 border-b-2 border-gt-line pb-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 truncate text-gt-2xl font-extrabold text-gt-ink">{TXN.merchant}</h2>
              <PixelIcon name="action-edit" size={14} className="shrink-0 opacity-40" />
            </div>
            <CategoryChip category={TXN.category} size="sm" />
            <span className="flex items-center gap-1.5 text-gt-sm font-bold text-gt-ink-3">
              <MapPinIcon className="h-3.5 w-3.5" />
              {TXN.location}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <MetaPill icon={<PixelIcon name="chart-calendar" size={14} />}>{TXN.date}</MetaPill>
              <MetaPill>{TXN.time}</MetaPill>
              <PaymentChip method={TXN.payment} size="sm" />
            </div>
          </div>
          <AttachTile />
        </div>
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-gt-lg border-2 border-gt-line-strong py-2 text-gt-sm font-extrabold text-gt-ink-3 transition hover:bg-gt-bg-3"
        >
          <PixelIcon name="scan-batch" size={16} /> Escaneo Lote
        </button>
      </Card>
      <ItemsSection density="tight" />
      <AddItemButton />
      <TotalFooter />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// B · COMPACT HEADER (COMFORTABLE ITEMS) — ThumbnailBadge, inline metadata,
//     payment in the inline metadata line, 14px item text
// ════════════════════════════════════════════════════════════════════════
function OptionB() {
  return (
    <div className="flex w-80 flex-col gap-3">
      <div className="flex items-center gap-3 border-b-2 border-gt-line pb-3">
        <ThumbnailBadge icon={TXN.storeIcon} category={TXN.category} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <h2 className="min-w-0 truncate text-gt-lg font-extrabold text-gt-ink">{TXN.merchant}</h2>
            <PixelIcon name="action-edit" size={12} className="shrink-0 opacity-40" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryChip category={TXN.category} size="sm" />
            <PaymentChip method={TXN.payment} size="sm" />
          </div>
          <div className="flex items-center gap-1 text-gt-xs font-bold text-gt-ink-3">
            <MapPinIcon className="h-3 w-3" />
            <span className="truncate">{TXN.location}</span>
            <span className="text-gt-line-strong">·</span>
            <PixelIcon name="chart-calendar" size={11} />
            <span>{TXN.date}</span>
            <span className="text-gt-line-strong">·</span>
            <span>{TXN.time}</span>
          </div>
        </div>
      </div>
      <ItemsSection density="comfortable" />
      <AddItemButton />
      <TotalFooter />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// C · VISUAL BANNER — category-tinted header band, payment near total
//     ("Pagado con" row), tight items
// ════════════════════════════════════════════════════════════════════════
function OptionC() {
  const token = getCategoryToken(TXN.category);
  return (
    <div className="flex w-80 flex-col gap-4">
      <div className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong shadow-gt-md">
        <div className="flex items-center gap-3 p-3" style={{ backgroundColor: token.tint }}>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <h2 className="min-w-0 truncate text-gt-xl font-extrabold text-gt-ink">{TXN.merchant}</h2>
              <PixelIcon name="action-edit" size={13} className="shrink-0 opacity-40" />
            </div>
            <div className="flex items-center gap-1.5">
              <PixelIcon name={token.icon} size={16} />
              <span className="text-gt-md font-extrabold" style={{ color: token.color }}>{token.label}</span>
            </div>
          </div>
          <AttachTile />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t-2 border-gt-line bg-gt-surface px-3 py-2.5 text-gt-sm font-bold text-gt-ink-3">
          <span className="flex items-center gap-1">
            <MapPinIcon className="h-3.5 w-3.5" />
            {TXN.location}
          </span>
          <span className="text-gt-line-strong">·</span>
          <span className="flex items-center gap-1">
            <PixelIcon name="chart-calendar" size={13} />
            {TXN.date}
          </span>
          <span className="text-gt-line-strong">·</span>
          <span>{TXN.time}</span>
        </div>
      </div>
      <ItemsSection density="tight" />
      <AddItemButton />
      <TotalFooter withPayment />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// D · EDITORIAL — Baloo hero title, underline metadata fields, payment near
//     total, comfortable items
// ════════════════════════════════════════════════════════════════════════
function OptionD() {
  return (
    <div className="flex w-80 flex-col gap-4">
      <Card padded={false} className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="border-b-2 border-gt-line-strong pb-1">
              <h2 className="truncate font-gt-display text-gt-3xl font-extrabold leading-tight text-gt-ink">{TXN.merchant}</h2>
            </div>
            <CategoryChip category={TXN.category} />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 border-b-2 border-gt-line pb-1.5">
                <MapPinIcon className="h-4 w-4 text-gt-ink-3" />
                <span className="text-gt-md font-semibold text-gt-ink">{TXN.location}</span>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 border-b-2 border-gt-line pb-1.5">
                  <PixelIcon name="chart-calendar" size={16} />
                  <span className="text-gt-md font-semibold text-gt-ink">{TXN.date}</span>
                </div>
                <div className="flex items-center gap-2 border-b-2 border-gt-line pb-1.5">
                  <span className="text-gt-md font-semibold text-gt-ink">{TXN.time}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm transition hover:-translate-y-0.5 hover:shadow-gt-md"
            aria-label="Adjuntar foto"
          >
            <PixelIcon name="scan-receipt" size={24} />
          </button>
        </div>
      </Card>
      <ItemsSection density="comfortable" />
      <AddItemButton />
      <TotalFooter withPayment />
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  {
    id: "A",
    label: "Legacy-faithful (tight)",
    note: "BoletApp layout 1:1 — card p-3, gap-2 vertical rhythm, header divider, outlined metadata pills, attach tile. Payment chip in the header. 12px item rows (highest density). Includes Escaneo Lote.",
    render: () => <OptionA />,
  },
  {
    id: "B",
    label: "Compact header / comfortable items",
    note: "ThumbnailBadge + inline metadata header (densest header). Payment chip in the inline pill row. 14px item rows for easier reading.",
    render: () => <OptionB />,
  },
  {
    id: "C",
    label: "Visual banner / payment at total",
    note: "Category-tinted banner header. Payment shown as a 'Pagado con' row above the total (not in header). Tight 12px items.",
    render: () => <OptionC />,
  },
  {
    id: "D",
    label: "Editorial / payment at total",
    note: "Baloo hero merchant title, underline metadata fields, IconButton attach. Payment in the 'Pagado con' row. Comfortable 14px items.",
    render: () => <OptionD />,
  },
];

const meta = {
  title: "Design System/Spikes/Transaction Detail",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike
      title="Transaction detail — legacy spacing + payment indicator"
      intro="Recreated from BoletApp EditView (same spacing/density), re-skinned in geometric grammar. Each item row carries name · total · unit price · units · category. Payment indicator (PaymentChip) explored in the header (A/B) and near the total (C/D), at different information densities."
      options={OPTIONS}
      {...args}
    />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {};
