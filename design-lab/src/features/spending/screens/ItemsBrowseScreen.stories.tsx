import type { Meta, StoryObj } from "@storybook/react-vite";
import { ItemsBrowseScreen } from "./ItemsBrowseScreen";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";

const meta: Meta<typeof ItemsBrowseScreen> = {
  title: "Features/Spending/ItemsBrowseScreen",
  component: ItemsBrowseScreen,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (_args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <ItemsBrowseScreen />
    </AppSurface>
  ),
};
