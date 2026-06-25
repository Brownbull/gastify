import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { XIcon } from "@design-system/assets/icons";
import { IconButton } from "./IconButton";

const meta = {
  title: "Design System/Atoms/IconButton",
  component: IconButton,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Square geometric tile that holds an icon. Per the icon convention: the glyph is normally a PixelIcon (meaningful); utility actions (close/back/submit/cancel) may use a stroke icon (e.g. the X here).",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Recommended PixelIcon sizes per IconButton size (DM-12 bump): md→26, lg→30,
// fab→34. Keeps the glyph reading clearly inside the tile.
export const Variants: Story = {
  args: { label: "Escanear", children: null },
  render: () => (
    <div className="flex flex-wrap items-center gap-4 bg-gt-bg p-8">
      <IconButton label="Escanear" variant="primary">
        <PixelIcon name="scan-receipt" size={26} />
      </IconButton>
      <IconButton label="Notificaciones">
        <PixelIcon name="nav-alerts" size={26} />
      </IconButton>
      <IconButton label="Presupuesto" variant="accent">
        <PixelIcon name="fin-budget" size={26} />
      </IconButton>
      <IconButton label="Filtrar" variant="soft">
        <PixelIcon name="action-filter" size={26} />
      </IconButton>
      <IconButton label="Inicio" active>
        <PixelIcon name="nav-home" size={26} />
      </IconButton>
      <IconButton label="Cerrar" variant="soft">
        <XIcon className="h-6 w-6 text-gt-ink" />
      </IconButton>
    </div>
  ),
};

export const Sizes: Story = {
  args: { label: "Escanear", children: null },
  render: () => (
    <div className="flex flex-wrap items-end gap-4 bg-gt-bg p-8">
      <IconButton label="md" size="md" variant="primary">
        <PixelIcon name="nav-home" size={26} />
      </IconButton>
      <IconButton label="lg" size="lg" variant="primary">
        <PixelIcon name="nav-home" size={30} />
      </IconButton>
      <IconButton label="fab" size="fab" variant="primary">
        <PixelIcon name="nav-scan" size={34} />
      </IconButton>
    </div>
  ),
};
