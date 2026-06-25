import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilterSheet, FilterTriggerButton } from "./FilterSheet";
import { BROWSE_FACETS } from "@lib/browseFixtures";

const meta: Meta<typeof FilterSheet> = {
  title: "Design System/Organisms/FilterSheet",
  component: FilterSheet,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-80 bg-gt-bg p-gt-16">
      <FilterSheet
        facets={BROWSE_FACETS}
        selection={{}}
        onApply={() => {}}
        onClear={() => {}}
        onClose={() => {}}
        className="h-[600px]"
      />
    </div>
  ),
};

export const WithSelection: Story = {
  render: () => (
    <div className="w-80 bg-gt-bg p-gt-16">
      <FilterSheet
        facets={BROWSE_FACETS}
        selection={{ category: ["supermercados", "restaurantes"], period: ["month:74"], sort: ["total:desc"] }}
        onApply={() => {}}
        onClear={() => {}}
        onClose={() => {}}
        className="h-[600px]"
      />
    </div>
  ),
};

export const TriggerButton: Story = {
  render: () => (
    <div className="flex gap-gt-16 bg-gt-bg p-gt-16">
      <FilterTriggerButton activeCount={0} />
      <FilterTriggerButton activeCount={3} />
    </div>
  ),
};
