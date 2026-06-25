import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { MapPinIcon } from "@design-system/assets/icons";
import { Badge } from "@design-system/atoms/Badge";
import { Card } from "./Card";
import { CategoryChip } from "./CategoryChip";
import { CompactRow, CompactRowList } from "./CompactRowList";
import { ThumbnailBadge } from "./ThumbnailBadge";

const meta = {
  title: "Design System/Molecules/CompactRowList",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Txn {
  store: string;
  thumbnail: string;
  category: string;
  date: string;
  location: string;
  items: number;
  amount: string;
  badge?: string;
  firstItem?: { name: string; qty: number; price: string };
}

const TXNS: Txn[] = [
  {
    store: "Supermercado Líder",
    thumbnail: "item-pantry",
    category: "supermercados",
    date: "hoy 18:42",
    location: "Villarrica",
    items: 5,
    amount: "$45.990",
    firstItem: { name: "Arroz integral 1kg", qty: 2, price: "$3.490" },
  },
  {
    store: "Copec Apoquindo",
    thumbnail: "item-car-accessories",
    category: "transporte-vehiculo",
    date: "ayer",
    location: "Las Condes",
    items: 1,
    amount: "$25.000",
    firstItem: { name: "Bencina 95 octanos", qty: 1, price: "$25.000" },
  },
  {
    store: "Farmacia Cruz Verde",
    thumbnail: "item-medications",
    category: "salud-bienestar",
    date: "ayer",
    location: "Villarrica",
    items: 2,
    amount: "$12.350",
    badge: "duplicado",
    firstItem: { name: "Ibuprofeno 400mg", qty: 1, price: "$4.990" },
  },
  {
    store: "Café Altura",
    thumbnail: "item-beverages",
    category: "restaurantes",
    date: "lun 12 jun",
    location: "Pucón",
    items: 1,
    amount: "$8.400",
    firstItem: { name: "Latte grande", qty: 1, price: "$8.400" },
  },
];

function MetaLine({ txn }: { txn: Txn }) {
  return (
    <>
      <PixelIcon name="chart-calendar" size={12} />
      <span className="text-gt-xs font-bold">{txn.date}</span>
      <span className="text-gt-line-strong">·</span>
      <MapPinIcon className="h-3 w-3" />
      <span className="text-gt-xs font-bold">{txn.location}</span>
    </>
  );
}

/** category chip, then the duplicate flag on its own line below it. */
function Tags({ txn }: { txn: Txn }) {
  return (
    <>
      <CategoryChip category={txn.category} size="sm" />
      {txn.badge ? <Badge tone="warning">{txn.badge}</Badge> : null}
    </>
  );
}

function ItemDetail({ txn }: { txn: Txn }) {
  if (!txn.firstItem) return null;
  return (
    <div className="flex items-center gap-3 rounded-gt-lg bg-gt-bg-3 px-3 py-2">
      <PixelIcon name={txn.thumbnail} size={24} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-gt-sm font-bold text-gt-ink">{txn.firstItem.name}</span>
        <span className="text-gt-xs font-semibold text-gt-ink-3">{txn.firstItem.qty}× · {txn.firstItem.price}</span>
      </div>
      {txn.items > 1 ? (
        <button type="button" className="text-gt-sm font-extrabold text-gt-primary hover:underline">Ver más</button>
      ) : null}
    </div>
  );
}

export const Transactions: Story = {
  render: () => (
    <div className="max-w-md bg-gt-bg p-6">
      <Card
        title="Recientes"
        action={
          <a href="#" onClick={(e) => e.preventDefault()} className="text-gt-sm font-extrabold text-gt-primary">
            Ver todo →
          </a>
        }
      >
        <CompactRowList>
          {TXNS.map((t) => (
            <CompactRow
              key={t.store}
              leading={<ThumbnailBadge icon={t.thumbnail} category={t.category} />}
              title={t.store}
              meta={<MetaLine txn={t} />}
              tags={<Tags txn={t} />}
              trailing={<span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t.amount}</span>}
              detailLabel={`${t.items} ${t.items === 1 ? "ítem" : "ítems"}`}
              detail={<ItemDetail txn={t} />}
            />
          ))}
        </CompactRowList>
      </Card>
    </div>
  ),
};

export const ExpandedByDefault: Story = {
  render: () => (
    <div className="max-w-md bg-gt-bg p-6">
      <Card title="Con detalle abierto">
        <CompactRowList>
          <CompactRow
            leading={<ThumbnailBadge icon="item-pantry" category="supermercados" />}
            title="Supermercado Líder"
            meta={<MetaLine txn={TXNS[0]} />}
            tags={<Tags txn={TXNS[0]} />}
            trailing={<span className="font-gt-display text-gt-md font-extrabold text-gt-ink">$45.990</span>}
            detailLabel={`${TXNS[0].items} ítems`}
            detail={<ItemDetail txn={TXNS[0]} />}
            expanded
          />
        </CompactRowList>
      </Card>
    </div>
  ),
};
