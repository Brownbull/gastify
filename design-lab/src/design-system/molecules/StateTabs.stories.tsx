import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { StateTabs, stateTabId } from "./StateTabs";

const meta = {
  title: "Design System/Molecules/StateTabs",
  component: StateTabs,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Showcase state switcher — sits ABOVE the AppSurface frame so ONE frame flips between screen states (suite convention; never stack frames per state). The controlled element carries role=tabpanel + aria-labelledby via `stateTabId`.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof StateTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const SCAN_STATES = ["Inactivo", "Subiendo", "Procesando", "Listo", "Error"];
const PANEL_ID = "scan-state-panel";

function InteractiveDemo() {
  const [active, setActive] = useState(SCAN_STATES[0]);
  return (
    <div className="flex flex-col items-center gap-4 bg-gt-bg p-6">
      <StateTabs tabs={SCAN_STATES} active={active} onChange={setActive} panelId={PANEL_ID} />
      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={stateTabId(PANEL_ID, active)}
        className="flex h-40 w-80 items-center justify-center rounded-gt-2xl border border-gt-line bg-gt-surface text-gt-lg text-gt-ink-2 shadow-gt-sm"
      >
        Estado: {active}
      </div>
    </div>
  );
}

export const Interactive: Story = {
  args: { tabs: SCAN_STATES, active: SCAN_STATES[0], onChange: () => {}, panelId: PANEL_ID },
  render: () => <InteractiveDemo />,
};
