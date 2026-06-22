import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { HeaderAction } from "@design-system/organisms/Nav";
import { ScanModeChooserScreen } from "@features/scan/screens/ScanModeChooserScreen";
import { GastosScreen } from "./GastosScreen";
import { SPEND_REPS, type SpendRepresentation } from "../components/TendenciasRepresentations";

/**
 * Features/Gastos/Screens/GastosScreen — the analytics tab inside AppScaffold.
 * Gastos shows the three spending representations; Dona / Mapa / Flujo are
 * switched from the HEADER (diagram icon buttons next to the profile, Gustify
 * pattern). The dimension picker + draggable period bar live in-screen.
 */
const meta: Meta = {
  title: "Features/Gastos/Screens/GastosScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

function GastosInShell({ platform }: { platform: Platform }) {
  const [scanOpen, setScanOpen] = useState(false);
  const [rep, setRep] = useState<SpendRepresentation>("dona");

  // the diagram switcher (donut / treemap / sankey) lives in the header, next to
  // the profile avatar — the slot the old Tendencias/Reportes switcher used.
  const switcher = SPEND_REPS.map((r) => (
    <HeaderAction key={r.id} icon={r.icon} label={r.label} active={rep === r.id} onClick={() => setRep(r.id)} />
  ));

  return (
    <AppScaffold
      platform={platform}
      active="gastos"
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
      <GastosScreen platform={platform} rep={rep} />
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
