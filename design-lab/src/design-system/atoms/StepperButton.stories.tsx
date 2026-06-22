import type { Meta, StoryObj } from "@storybook/react-vite";
import { StepperButton } from "./StepperButton";

const meta = {
  title: "Design System/Atoms/StepperButton",
  component: StepperButton,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { direction: "next", label: "Siguiente" },
  argTypes: {
    direction: { control: "radio", options: ["prev", "next"] },
    variant: { control: "radio", options: ["plain", "bordered"] },
  },
} satisfies Meta<typeof StepperButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {};
export const Bordered: Story = { args: { variant: "bordered" } };

export const Pair: Story = {
  render: () => (
    <div className="flex items-center gap-2 bg-gt-bg p-4">
      <StepperButton direction="prev" label="Anterior" variant="bordered" />
      <span className="text-gt-md font-extrabold text-gt-ink">Ene '26</span>
      <StepperButton direction="next" label="Siguiente" variant="bordered" />
    </div>
  ),
};
