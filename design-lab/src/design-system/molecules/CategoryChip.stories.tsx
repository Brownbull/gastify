import type { Meta, StoryObj } from "@storybook/react-vite";
import { CATEGORY_TOKENS, CATEGORIAS, FAMILIAS, GIROS, RUBROS, childrenOf } from "@lib/categoryTokens";
import { CategoryChip } from "./CategoryChip";

/**
 * Config-driven category label (DM-4). Color + pixel icon come from
 * `lib/categoryTokens.ts` by id. STORE: L1 Rubro (12) → L2 Giro (44).
 * ITEM: L3 Familia (9) → L4 Categoría (42). Sub-levels inherit the parent's
 * color, distinguished by their pixel icon.
 */
const meta = {
  title: "Design System/Molecules/CategoryChip",
  component: CategoryChip,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Every L1–L4 category has a color + pixel icon from the config. `soft` (tint fill) is the default; `solid` (saturated fill) for emphasis. Non-category labels (date/location) use the standard `Label` instead.",
      },
    },
  },
  tags: ["autodocs"],
  args: { category: "supermercados", variant: "soft", size: "md" },
  argTypes: {
    category: { control: "select", options: Object.keys(CATEGORY_TOKENS) },
    variant: { control: "radio", options: ["soft", "solid"] },
    size: { control: "radio", options: ["sm", "md"] },
  },
} satisfies Meta<typeof CategoryChip>;

export default meta;
type Story = StoryObj<typeof meta>;

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 bg-gt-bg p-6">{children}</div>;
}

export const Playground: Story = {};

/** L1 — 12 rubros, each a distinct color. */
export const L1Rubros: Story = {
  name: "L1 · Rubros (12)",
  render: () => (
    <Wrap>
      {RUBROS.map((r) => (
        <CategoryChip key={r.id} category={r.id} />
      ))}
    </Wrap>
  ),
};

/** L1 in solid for emphasis. */
export const L1RubrosSolid: Story = {
  name: "L1 · Rubros · solid",
  render: () => (
    <Wrap>
      {RUBROS.map((r) => (
        <CategoryChip key={r.id} category={r.id} variant="solid" />
      ))}
    </Wrap>
  ),
};

/** L2 — 44 giros, grouped under their parent rubro (inherit the rubro hue). */
export const L2Giros: Story = {
  name: "L2 · Giros (44)",
  render: () => (
    <div className="flex flex-col gap-4 bg-gt-bg p-6">
      {RUBROS.map((r) => {
        const giros = childrenOf(r.id);
        if (giros.length === 0) return null;
        return (
          <div key={r.id} className="flex flex-col gap-1.5">
            <span className="text-gt-sm font-extrabold text-gt-ink-2">{r.label}</span>
            <div className="flex flex-wrap gap-2">
              {giros.map((g) => (
                <CategoryChip key={g.id} category={g.id} size="sm" />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  ),
};

/** L3 — 9 familias, distinct base colors. */
export const L3Familias: Story = {
  name: "L3 · Familias (9)",
  render: () => (
    <Wrap>
      {FAMILIAS.map((f) => (
        <CategoryChip key={f.id} category={f.id} />
      ))}
    </Wrap>
  ),
};

/** L4 — 42 categorías, grouped under their parent familia. */
export const L4Categorias: Story = {
  name: "L4 · Categorías (42)",
  render: () => (
    <div className="flex flex-col gap-4 bg-gt-bg p-6">
      {FAMILIAS.map((f) => {
        const cats = childrenOf(f.id);
        if (cats.length === 0) return null;
        return (
          <div key={f.id} className="flex flex-col gap-1.5">
            <span className="text-gt-sm font-extrabold text-gt-ink-2">{f.label}</span>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <CategoryChip key={c.id} category={c.id} size="sm" />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  ),
};

export const Counts: Story = {
  name: "Counts",
  render: () => (
    <div className="bg-gt-bg p-6 text-gt-md font-bold text-gt-ink">
      L1 {RUBROS.length} · L2 {GIROS.length} · L3 {FAMILIAS.length} · L4 {CATEGORIAS.length} ·{" "}
      total {Object.keys(CATEGORY_TOKENS).length}
    </div>
  ),
};
