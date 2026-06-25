import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { StatementsListScreen } from "./StatementsListScreen";

/**
 * Features/Scan/Screens/StatementsListScreen — the uploaded cartolas (backend GET
 * /statements). Card + period + status (Conciliada w/ coverage / Procesando /
 * Con error), a lock on password-protected PDFs, and "Subir cartola".
 */
const meta: Meta = {
  title: "Features/Scan/Screens/StatementsListScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <StatementsListScreen platform={platform} onBack={() => {}} onUpload={() => {}} onOpenStatement={() => {}} />
      </AppSurface>
    );
  },
};

export const Empty: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <StatementsListScreen platform={platform} statements={[]} onBack={() => {}} onUpload={() => {}} />
      </AppSurface>
    );
  },
};

/** Reached from the avatar dropdown → "Cartolas" (peer to Notificaciones / Grupos / Ajustes). */
export const FromAvatar: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <AppScaffold
          platform={platform}
          active="home"
          onProfileSelect={(k) => { if (k === "statements") setOpen(true); }}
          overlay={open ? <StatementsListScreen platform={platform} onBack={() => setOpen(false)} onUpload={() => setOpen(false)} onOpenStatement={() => {}} /> : undefined}
        >
          <div className="flex h-full flex-col items-center justify-center gap-gt-8 px-gt-16 text-center">
            <p className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Abre Cartolas desde el avatar</p>
            <p className="text-gt-sm text-gt-ink-3">
              Toca el avatar (arriba a la derecha) → <b>Cartolas</b>.
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
