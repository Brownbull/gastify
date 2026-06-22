import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { HeaderAction } from "@design-system/organisms/Nav";
import { TendenciasRepresentations } from "./TendenciasRepresentations";

/**
 * Features/Gastos/Spikes/TendenciasRepresentations — SPIKE: the Tendencias spend
 * shown three ways (Dona / Mapa / Flujo), inside the Gastos shell. Switch the
 * representation to compare the donut, treemap, and Sankey before deciding which
 * (or all) to wire into the production Tendencias subsection.
 */
const meta: Meta = {
  title: "Features/Gastos/Spikes/TendenciasRepresentations",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

function Spike({ platform }: { platform: Platform }) {
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
      <TendenciasRepresentations platform={platform} />
    </AppScaffold>
  );
}

export const Default: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <Spike platform={platform} />
      </AppSurface>
    );
  },
};
