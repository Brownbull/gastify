import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { HeaderAction } from "@design-system/organisms/Nav";
import { TendenciasRepresentations } from "./TendenciasRepresentations";

/**
 * Features/Gastos/Components/TendenciasRepresentations — the Tendencias spend
 * shown three ways (Dona / Mapa / Flujo) behind a representation switcher with a
 * shared level/count control row. Promoted from the former design-lab spike;
 * rendered in production by GastosScreen's Tendencias subsection. Shown here in
 * isolation inside the Gastos shell (without GastosScreen's period chrome) so the
 * switcher, drill-down, level navigator, and per-representation states are
 * inspectable on their own.
 */
const meta: Meta = {
  title: "Features/Gastos/Components/TendenciasRepresentations",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

function Demo({ platform }: { platform: Platform }) {
  const contentMax = platform === "desktop" ? "60rem" : undefined;
  return (
    <AppScaffold
      platform={platform}
      active="gastos"
      title="Tendencias"
      headerActions={[
        <HeaderAction key="t" icon="nav-trends" label="Tendencias" active />,
        <HeaderAction key="r" icon="nav-reports" label="Reportes" />,
      ]}
    >
      {/* mirror GastosScreen's fill column so Mapa/Flujo have a definite height */}
      <div className="mx-auto flex h-full w-full flex-col pt-gt-4" style={{ maxWidth: contentMax }}>
        <TendenciasRepresentations />
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
