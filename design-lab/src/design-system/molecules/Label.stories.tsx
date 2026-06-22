import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { MapPinIcon } from "@design-system/assets/icons";
import { CategoryChip } from "./CategoryChip";
import { Label } from "./Label";

/**
 * Standard metadata label (DM-4) — one fixed surface for non-category
 * attributes (date, location, count). Contrast with CategoryChip, whose color
 * varies by taxonomy category.
 */
const meta = {
  title: "Design System/Molecules/Label",
  component: Label,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  args: { children: "hoy 18:42" },
  render: () => (
    <div className="flex flex-wrap items-center gap-2 bg-gt-bg p-6">
      <Label icon={<PixelIcon name="chart-calendar" size={16} />}>hoy 18:42</Label>
      <Label icon={<MapPinIcon className="h-4 w-4 text-gt-ink-2" />}>Apoquindo, Las Condes</Label>
      <Label icon={<PixelIcon name="fin-receipt" size={16} />} tone="muted">12 ítems</Label>
    </div>
  ),
};

/** Both together — category color varies, standard labels stay neutral. */
export const VsCategory: Story = {
  args: { children: "—" },
  render: () => (
    <div className="flex flex-wrap items-center gap-2 bg-gt-bg p-6">
      <CategoryChip category="supermercados" />
      <Label icon={<PixelIcon name="chart-calendar" size={16} />}>hoy 18:42</Label>
      <Label icon={<MapPinIcon className="h-4 w-4 text-gt-ink-2" />}>Las Condes</Label>
    </div>
  ),
};
