import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./Switch";

/**
 * Design System/Atoms/Switch — the binary on/off toggle (ink-bordered pill,
 * gt-primary when ON, sliding white knob). Controlled; sizes sm/md; disabled +
 * loading states.
 */
const meta: Meta<typeof Switch> = {
  title: "Design System/Atoms/Switch",
  component: Switch,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Switch>;

function Demo({ size, disabled, loading, initial }: { size?: "sm" | "md"; disabled?: boolean; loading?: boolean; initial?: boolean }) {
  const [on, setOn] = useState(initial ?? false);
  return <Switch checked={on} onChange={setOn} size={size} disabled={disabled} loading={loading} label="Demo" />;
}

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-gt-16">
      <Demo />
      <Demo initial />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-gt-16">
      <Demo size="sm" initial />
      <Demo size="md" initial />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-gt-16">
      <Demo initial />
      <Demo disabled initial />
      <Demo loading initial />
      <Demo disabled />
    </div>
  ),
};
