import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface } from "@design-system/organisms/AppSurface";
import { Button } from "./Button";
import { Modal } from "./Modal";

const meta = {
  title: "Design System/Atoms/Modal",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Center: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div className="bg-gt-bg p-8">
        <AppSurface platform="mobile">
          <div className="relative min-h-[500px] p-6">
            <Button onClick={() => setOpen(true)}>Abrir modal</Button>
            <Modal open={open} onClose={() => setOpen(false)} title="Título del modal">
              <p className="text-gt-md font-semibold text-gt-ink">Contenido del modal. Esc o el fondo lo cierran.</p>
            </Modal>
          </div>
        </AppSurface>
      </div>
    );
  },
};

export const Sheet: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div className="bg-gt-bg p-8">
        <AppSurface platform="mobile">
          <div className="relative min-h-[500px] p-6">
            <Button onClick={() => setOpen(true)}>Abrir hoja</Button>
            <Modal open={open} onClose={() => setOpen(false)} title="Hoja inferior" placement="sheet">
              <p className="text-gt-md font-semibold text-gt-ink">Variante bottom-sheet.</p>
            </Modal>
          </div>
        </AppSurface>
      </div>
    );
  },
};
