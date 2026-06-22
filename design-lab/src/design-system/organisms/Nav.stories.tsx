import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppHeader, BottomNav, SideNav, ScanFab, HeaderAction, PerfilMenu } from "./Nav";

const meta = {
  title: "Design System/Organisms/Nav",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Body({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex-1 space-y-gt-12 overflow-y-auto bg-gt-bg p-gt-16">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs" />
      ))}
    </div>
  );
}

/** The settled mobile chrome — Gustify icon+label bottom nav + corner square-plus FAB. */
export const MobileShell: Story = {
  render: () => {
    const [active, setActive] = useState("inicio");
    return (
      <div className="relative mx-auto flex h-140 w-[360px] flex-col overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong">
        <AppHeader variant="home" />
        <Body />
        <BottomNav active={active} onSelect={setActive} alertsTab="gastos" />
        <ScanFab placement="corner" />
      </div>
    );
  },
};

/** The four AppHeader variants (one flexible header). */
export const Headers: Story = {
  render: () => (
    <div className="flex flex-col gap-gt-12 bg-gt-bg p-gt-16">
      <div className="rounded-gt-xl border-2 border-gt-line-strong">
        <AppHeader variant="home" />
      </div>
      <div className="rounded-gt-xl border-2 border-gt-line-strong">
        <AppHeader variant="browse" title="Compras" actions={<><HeaderAction icon="action-search" label="Buscar" /><HeaderAction icon="action-filter" label="Filtrar" /></>} />
      </div>
      <div className="rounded-gt-xl border-2 border-gt-line-strong">
        <AppHeader variant="detail" title="Boleta · Líder" onBack={() => {}} />
      </div>
      <div className="rounded-gt-xl border-2 border-gt-line-strong">
        <AppHeader variant="settings" title="Configuración" subtitle="v1.0 · gastify" onBack={() => {}} />
      </div>
    </div>
  ),
};

/** The desktop left panel — icon+label rows, profile block, top-right options/collapse. */
export const DesktopLeftPanel: Story = {
  render: () => {
    const [active, setActive] = useState("gastos");
    const [collapsed, setCollapsed] = useState(false);
    return (
      <div className="flex h-105 overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong">
        <SideNav active={active} onSelect={setActive} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
        <div className="relative flex flex-1 flex-col">
          <AppHeader variant="browse" title="Gastos" actions={<HeaderAction icon="action-filter" label="Filtrar" />} />
          <Body rows={4} />
          <ScanFab placement="corner" />
        </div>
      </div>
    );
  },
};

/** The Perfil / overflow menu. */
export const Perfil: Story = {
  render: () => (
    <div className="bg-gt-bg p-gt-16">
      <PerfilMenu />
    </div>
  ),
};
