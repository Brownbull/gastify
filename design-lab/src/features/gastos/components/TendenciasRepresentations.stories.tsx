import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { HeaderAction } from "@design-system/organisms/Nav";
import { TendenciasRepresentations, SPEND_REPS, type SpendRepresentation } from "./TendenciasRepresentations";

/**
 * Features/Gastos/Components/TendenciasRepresentations — the Tendencias spend
 * shown three ways (Dona / Mapa / Flujo). The representation is controlled by the
 * header diagram switcher (donut / treemap / sankey icons), exactly as GastosScreen
 * drives it. Shown here in isolation inside the Gastos shell (without GastosScreen's
 * period chrome) so the drill-down, level navigator, and per-representation states
 * are inspectable on their own.
 */
const meta: Meta = {
  title: "Features/Gastos/Components/TendenciasRepresentations",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

function Demo({ platform }: { platform: Platform }) {
  const [rep, setRep] = useState<SpendRepresentation>("dona");
  const contentMax = platform === "desktop" ? "60rem" : undefined;
  const switcher = SPEND_REPS.map((r) => (
    <HeaderAction key={r.id} icon={r.icon} label={r.label} active={rep === r.id} onClick={() => setRep(r.id)} />
  ));
  return (
    <AppScaffold platform={platform} active="gastos" title="Gastos" headerActions={switcher}>
      {/* mirror GastosScreen's fill column so Mapa/Flujo have a definite height */}
      <div className="mx-auto flex h-full w-full flex-col pt-gt-4" style={{ maxWidth: contentMax }}>
        <TendenciasRepresentations rep={rep} />
      </div>
    </AppScaffold>
  );
}

export const Default: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <Demo platform={platform} />
      </AppSurface>
    );
  },
};
