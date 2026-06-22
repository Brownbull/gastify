import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { HeaderAction } from "@design-system/organisms/Nav";
import { ScanModeChooserScreen } from "@features/scan/screens/ScanModeChooserScreen";
import { GastosScreen, type GastosView } from "./GastosScreen";

/**
 * Features/Gastos/Screens/GastosScreen — the analytics tab inside AppScaffold.
 * Tendencias / Reportes are SUBSECTIONS: switched from the header (icon buttons
 * next to the profile, Gustify pattern); the active subsection is the title and
 * drives the content. The dimension bar + draggable period bar live in-screen.
 */
const meta: Meta = {
  title: "Features/Gastos/Screens/GastosScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

const SUBSECTIONS: { id: GastosView; icon: string; label: string }[] = [
  { id: "tendencias", icon: "nav-trends", label: "Tendencias" },
  { id: "reportes", icon: "nav-reports", label: "Reportes" },
];

function GastosInShell({ platform }: { platform: Platform }) {
  const [scanOpen, setScanOpen] = useState(false);
  const [view, setView] = useState<GastosView>("tendencias");
  const title = SUBSECTIONS.find((s) => s.id === view)?.label ?? "Gastos";

  const switcher = SUBSECTIONS.map((s) => (
    <HeaderAction key={s.id} icon={s.icon} label={s.label} active={view === s.id} onClick={() => setView(s.id)} />
  ));

  return (
    <AppScaffold
      platform={platform}
      active="gastos"
      title={title}
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
      <GastosScreen platform={platform} view={view} />
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
