import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "./AppSurface";
import { AppScaffold } from "./AppScaffold";
import { MAIN_NAV } from "./Nav";
import { ScanModeChooserScreen } from "@features/scan/screens/ScanModeChooserScreen";

/**
 * Design System/Organisms/App Scaffold — the composed application frame: the
 * 4-tab nav (BottomNav mobile/tablet, SideNav desktop) + the ScanFab, with a
 * screen rendered inside. Tap the violet "+" FAB to open the scan mode chooser
 * (it covers the whole frame on mobile/tablet, the content pane on desktop);
 * switch tabs from the nav. Use the platform toolbar for mobile/tablet/desktop.
 */
const meta: Meta = {
  title: "Design System/Organisms/AppScaffold",
  // fullscreen (not centered) so the desktop frame's w-full/max-w-1280 gets real
  // width — a centered wrapper collapses it and cramps the SideNav+content split.
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/** A stand-in for whatever screen the active tab renders. */
function SampleContent({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-gt-12 pt-gt-4">
      <p className="font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">{label}</p>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-16 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs" />
      ))}
    </div>
  );
}

function ShellDemo({ platform }: { platform: Platform }) {
  const [active, setActive] = useState("home");
  const [scanOpen, setScanOpen] = useState(false);
  const tab = MAIN_NAV.find((t) => t.key === active);
  // Inicio shows the wordmark (no title); other tabs show their label.
  const title = active === "home" ? undefined : tab?.label;

  return (
    <AppScaffold
      platform={platform}
      active={active}
      onSelect={setActive}
      title={title}
      alertsTab="spending"
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
      <SampleContent label={tab?.label ?? "Inicio"} />
    </AppScaffold>
  );
}

export const Default: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <ShellDemo platform={platform} />
      </AppSurface>
    );
  },
};
