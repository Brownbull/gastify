import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { NotificationsScreen } from "./NotificationsScreen";

/**
 * Features/Notifications/Screens/NotificationsScreen — the notification inbox,
 * reached from the avatar dropdown ("Notificaciones", badge 3). `Default` shows
 * the feed; `Empty` is the zero state; `FromAvatar` proves the real reach.
 */
const meta: Meta = {
  title: "Features/Notifications/Screens/NotificationsScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <NotificationsScreen onBack={() => {}} />
    </AppSurface>
  ),
};

export const Empty: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <NotificationsScreen notifications={[]} onBack={() => {}} />
    </AppSurface>
  ),
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
            if (k === "notifications") setOpen(true);
          }}
          overlay={open ? <NotificationsScreen onBack={() => setOpen(false)} /> : undefined}
        >
          <div className="flex h-full flex-col items-center justify-center gap-gt-8 px-gt-16 text-center">
            <p className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Abre Notificaciones desde el avatar</p>
            <p className="text-gt-sm text-gt-ink-3">
              Toca el avatar (arriba a la derecha) → <b>Notificaciones</b>.
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
