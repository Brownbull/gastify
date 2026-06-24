import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { HeaderAction } from "@design-system/organisms/Nav";
import { ScanModeChooserScreen } from "@features/scan/screens/ScanModeChooserScreen";
import { SpendingScreen } from "./SpendingScreen";
import { SPEND_REPS, type SpendRepresentation } from "../components/TrendsRepresentations";

/**
 * Features/Spending/Screens/SpendingScreen — the analytics tab inside AppScaffold.
 * Gastos shows the three spending representations; Dona / Mapa / Flujo are
 * switched from the HEADER (diagram icon buttons next to the profile, Gustify
 * pattern). The dimension picker + draggable period bar live in-screen.
 */
const meta: Meta = {
  title: "Features/Spending/Screens/SpendingScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

function GastosInShell({ platform }: { platform: Platform }) {
  const [scanOpen, setScanOpen] = useState(false);
  const [rep, setRep] = useState<SpendRepresentation>("donut");

  // the diagram switcher (donut / treemap / sankey) lives in the header, next to
  // the profile avatar — the slot the old Tendencias/Reportes switcher used.
  const switcher = SPEND_REPS.map((r) => (
    <HeaderAction key={r.id} icon={r.icon} label={r.label} active={rep === r.id} onClick={() => setRep(r.id)} />
  ));

  return (
    <AppScaffold
      platform={platform}
      active="spending"
      title="Gastos"
      headerActions={switcher}
      onScan={() => setScanOpen(true)}
      overlay={
        scanOpen ? (
          <ScanModeChooserScreen
            onClose={() => setScanOpen(false)}
            onSingle={() => setScanOpen(false)}
            onStatement={() => setScanOpen(false)}
            onManual={() => setScanOpen(false)}
          />
        ) : undefined
      }
    >
      <SpendingScreen platform={platform} rep={rep} />
    </AppScaffold>
  );
}

export const Default: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <GastosInShell platform={platform} />
      </AppSurface>
    );
  },
};
