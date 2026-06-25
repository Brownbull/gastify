import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select";

/**
 * Design System/Atoms/Select — single-choice dropdown (ink trigger + panel,
 * primary-dot on the selected option, click-outside/Esc close).
 */
const meta: Meta<typeof Select> = {
  title: "Design System/Atoms/Select",
  component: Select,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Select>;

const CURRENCIES = [
  { value: "CLP", label: "CLP — Peso Chileno" },
  { value: "USD", label: "USD — Dólar Estadounidense" },
  { value: "EUR", label: "EUR — Euro" },
];

export const Default: Story = {
  render: () => {
    function Demo() {
      const [v, setV] = useState("CLP");
      return (
        <div style={{ width: 280 }}>
          <Select value={v} onChange={setV} options={CURRENCIES} />
        </div>
      );
    }
    return <Demo />;
  },
};
