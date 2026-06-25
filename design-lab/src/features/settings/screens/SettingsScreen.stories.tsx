import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { SettingsScreen } from "./SettingsScreen";
import { SettingsFlow } from "./SettingsFlow";

/**
 * Features/Settings/Screens/SettingsScreen — the Ajustes hub. Reached from the
 * top-right avatar → ProfileMenu → "Ajustes", mounted as a full-surface overlay.
 * Grouped card-of-rows with a back-arrow header. `Default` shows it in isolation;
 * `FromAvatar` proves the real reach (open the avatar dropdown → Ajustes).
 */
const meta: Meta = {
  title: "Features/Settings/Screens/SettingsScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <SettingsScreen onBack={() => {}} onSelect={() => {}} />
      </AppSurface>
    );
  },
};

export const FromAvatar: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <AppScaffold
          platform={platform}
          active="home"
          onProfileSelect={(k) => {
            if (k === "settings") setOpen(true);
          }}
          overlay={open ? <SettingsFlow onClose={() => setOpen(false)} /> : undefined}
        >
          <div className="flex h-full flex-col items-center justify-center gap-gt-8 px-gt-16 text-center">
            <p className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Abre Ajustes desde el avatar</p>
            <p className="text-gt-sm text-gt-ink-3">
              Toca el avatar (arriba a la derecha) → <b>Ajustes</b>.
            </p>
          </div>
        </AppScaffold>
      );
    }
    return (
      <AppSurface platform={platform}>
        <Demo />
      </AppSurface>
    );
  },
};
