import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchRow } from "./SearchRow";
import { FilterTriggerButton } from "@design-system/organisms/FilterSheet";

const meta: Meta<typeof SearchRow> = {
  title: "Design System/Molecules/SearchRow",
  component: SearchRow,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-80 bg-gt-bg p-gt-16">
      <SearchRow icon="action-search" label="Buscar" placeholder="Buscar comercio o producto…" />
    </div>
  ),
};

export const WithFilterAction: Story = {
  render: () => (
    <div className="w-80 bg-gt-bg p-gt-16">
      <SearchRow
        icon="action-search"
        label="Buscar"
        placeholder="Buscar…"
        action={<FilterTriggerButton activeCount={2} />}
      />
    </div>
  ),
};
