import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { ScanModeChooserScreen } from "@features/scan/screens/ScanModeChooserScreen";
import { InicioScreen } from "./InicioScreen";
import { sampleHome, emptyHome } from "../model/HomeScreenModel";

/**
 * Features/Home/Screens/InicioScreen — the home dashboard, rendered inside the
 * AppScaffold (4-tab nav + scan FAB). The "+" FAB opens the scan mode chooser.
 * `state` switches default / empty / loading; the platform toolbar switches
 * mobile/tablet/desktop.
 */
type ScreenState = "default" | "empty" | "loading";

const meta: Meta<{ state: ScreenState }> = {
  title: "Features/Home/Screens/InicioScreen",
  // fullscreen so the desktop scaffold (SideNav + content pane) gets real width.
  parameters: { layout: "fullscreen" },
  argTypes: {
    state: { control: "inline-radio", options: ["default", "empty", "loading"] satisfies ScreenState[] },
  },
  args: { state: "default" },
};

export default meta;
type Story = StoryObj<{ state: ScreenState }>;

function InicioInShell({ platform, state }: { platform: Platform; state: ScreenState }) {
  const [scanOpen, setScanOpen] = useState(false);
  const model = state === "empty" ? emptyHome : sampleHome;

  return (
    <AppScaffold
      platform={platform}
      active="inicio"
      alertsTab="gastos"
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
      <InicioScreen model={model} loading={state === "loading"} platform={platform} />
    </AppScaffold>
  );
}

const inShell: Story["render"] = (args, { globals }) => {
  const platform = platformFromGlobals(globals);
  return (
    <AppSurface platform={platform}>
      <InicioInShell platform={platform} state={args.state} />
    </AppSurface>
  );
};

export const Default: Story = { args: { state: "default" }, render: inShell };
export const Empty: Story = { args: { state: "empty" }, render: inShell };
export const Loading: Story = { args: { state: "loading" }, render: inShell };
