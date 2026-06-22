import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { AppHeader, BareAction } from "./Nav";

const meta: Meta = {
  title: "Design System/Organisms/FilterIconPicker",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const FILTER_ICONS = [
  { name: "action-filter", label: "Current (original)" },
  { name: "action-filter-a", label: "A · Horizontal lines" },
  { name: "action-filter-b", label: "B · Sliders" },
  { name: "action-filter-c", label: "C · Funnel" },
  { name: "action-filter-d", label: "D · Checkbox" },
  { name: "action-filter-e", label: "E · Clean funnel" },
  { name: "action-filter-f", label: "F · Equalizer knobs" },
];

/** Compare all filter icon candidates side by side at multiple sizes. */
export const IconGrid: Story = {
  render: () => (
    <div className="flex flex-col gap-gt-16 bg-gt-bg p-gt-16">
      <h2 className="font-gt-display text-gt-2xl font-extrabold text-gt-ink">Filter Icon Options</h2>
      <div className="flex flex-wrap gap-gt-16">
        {FILTER_ICONS.map((ic) => (
          <div key={ic.name} className="flex flex-col items-center gap-gt-8 rounded-gt-2xl border-2 border-gt-line bg-gt-surface p-gt-16 shadow-gt-xs">
            <PixelIcon name={ic.name} size={32} />
            <PixelIcon name={ic.name} size={24} />
            <PixelIcon name={ic.name} size={18} />
            <span className="text-gt-xs font-extrabold text-gt-ink-2">{ic.label}</span>
          </div>
        ))}
      </div>

      <h3 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">In header context (bare action)</h3>
      <div className="flex flex-col gap-gt-12">
        {FILTER_ICONS.map((ic) => (
          <div key={ic.name} className="w-[390px] rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
            <AppHeader
              variant="browse"
              title="Compras"
              actions={<BareAction icon={ic.name} label="Filtros" badge={2} />}
            />
            <p className="px-gt-16 pb-gt-8 text-gt-xs font-bold text-gt-ink-3">{ic.label}</p>
          </div>
        ))}
      </div>
    </div>
  ),
};
