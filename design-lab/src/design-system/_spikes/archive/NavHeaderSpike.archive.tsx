import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AppHeader,
  BottomNav,
  SideNav,
  ScanFab,
  HeaderAction,
  PerfilMenu,
  type ScanFabPlacement,
} from "@design-system/organisms/Nav";
import { Spike, optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";

/**
 * SPIKE — Nav + Header chrome (Phase 7, the FIRST screen-chrome spike). IA is
 * FIXED at 4 tabs + scan-FAB (legacy + DM-5 agree). The spikes settle the open
 * questions: A scan-FAB placement · B header density · C Perfil treatment ·
 * D desktop chrome. Switch the platform toolbar to judge each per device.
 */

// a fake scrollable content body so the chrome reads in context.
function Body({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex-1 space-y-gt-12 overflow-y-auto bg-gt-bg p-gt-16">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs" />
      ))}
    </div>
  );
}

// a full phone shell: header + body + bottom nav + scan FAB
function PhoneShell({ fabPlacement = "corner", variant = "home", title }: { fabPlacement?: ScanFabPlacement; variant?: "home" | "browse"; title?: string }) {
  const [active, setActive] = useState("inicio");
  return (
    <div className="relative flex h-140 flex-col">
      {variant === "home" ? (
        <AppHeader variant="home" />
      ) : (
        <AppHeader
          variant="browse"
          title={title ?? "Compras"}
          actions={
            <>
              <HeaderAction icon="action-search" label="Buscar" />
              <HeaderAction icon="action-filter" label="Filtrar" />
            </>
          }
        />
      )}
      <Body />
      {/* bar-center: the FAB sits on the bar's top edge, so anchor it to the bar wrapper */}
      <div className="relative">
        <BottomNav active={active} onSelect={setActive} alertsTab="gastos" />
        {fabPlacement === "bar-center" ? <ScanFab placement="bar-center" /> : null}
      </div>
      {/* corner: anchors to this relative PhoneShell */}
      {fabPlacement === "corner" ? <ScanFab placement="corner" /> : null}
    </div>
  );
}

// ── A · scan-FAB placement ──────────────────────────────────────────────
function OptionA() {
  return (
    <div className="flex flex-wrap items-start gap-gt-24">
      {(["corner", "bar-center"] as ScanFabPlacement[]).map((p) => (
        <div key={p} className="flex flex-col items-center gap-gt-8">
          <span className="text-gt-sm font-extrabold text-gt-ink-3">{p === "corner" ? "A1 · corner-floating (DM-5)" : "A3 · center-in-bar (legacy)"}</span>
          <div className="w-[320px] overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong">
            <PhoneShell fabPlacement={p} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── B · header density (the variant set) ────────────────────────────────
function OptionB() {
  return (
    <div className="flex flex-col gap-gt-12">
      <div className="rounded-gt-xl border-2 border-gt-line-strong">
        <AppHeader variant="home" />
      </div>
      <div className="rounded-gt-xl border-2 border-gt-line-strong">
        <AppHeader variant="browse" title="Compras" actions={<><HeaderAction icon="action-search" label="Buscar" /><HeaderAction icon="action-filter" label="Filtrar" /></>} />
      </div>
      <div className="rounded-gt-xl border-2 border-gt-line-strong">
        <AppHeader variant="detail" title="Boleta · Líder" onBack={() => {}} actions={<HeaderAction icon="action-filter" label="Editar" />} />
      </div>
      <div className="rounded-gt-xl border-2 border-gt-line-strong">
        <AppHeader variant="settings" title="Configuración" subtitle="v1.0 · gastify" onBack={() => {}} />
      </div>
    </div>
  );
}

// ── C · Perfil treatment ────────────────────────────────────────────────
function OptionC() {
  return (
    <div className="flex flex-wrap items-start gap-gt-24">
      <div className="flex flex-col items-center gap-gt-8">
        <span className="text-gt-sm font-extrabold text-gt-ink-3">C1 · Perfil = tab → screen</span>
        <div className="w-[320px] overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong">
          <PhoneShell variant="home" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-gt-8">
        <span className="text-gt-sm font-extrabold text-gt-ink-3">C3 · avatar → Perfil menu (recommended)</span>
        <div className="relative w-[320px]">
          <div className="overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong">
            <AppHeader variant="home" />
            <Body rows={3} />
          </div>
          <div className="mt-gt-8 flex justify-end">
            <PerfilMenu />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── D · desktop chrome — Gustify left panel (icon+label rows + profile + options) ──
function OptionD() {
  const [active, setActive] = useState("gastos");
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex flex-col gap-gt-12">
      <span className="text-gt-sm font-extrabold text-gt-ink-3">Gustify left panel — icon+label rows · profile block · top-right options/collapse</span>
      <div className="relative flex h-105 overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong">
        <SideNav active={active} onSelect={setActive} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
        <div className="relative flex flex-1 flex-col">
          <AppHeader variant="browse" title="Gastos" actions={<HeaderAction icon="action-filter" label="Filtrar" />} />
          <Body rows={4} />
          <ScanFab placement="corner" />
        </div>
      </div>
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Scan-FAB placement", note: "A1 corner-floating (DM-5 mobile) vs A3 center-in-bar elevated (legacy). Same 4-tab bar — judge where scan feels right.", render: () => <OptionA /> },
  { id: "B", label: "Header variants", note: "The one flexible AppHeader across home (wordmark+avatar) / browse (title+search+filter) / detail (back+title) / settings (back+subtitle). Confirm one header covers all.", render: () => <OptionB /> },
  { id: "C", label: "Perfil treatment", note: "C1 Perfil tab → full screen (DM-5) vs C3 avatar → Perfil menu popover (recommended — tab for browse + avatar for quick menu).", render: () => <OptionC /> },
  { id: "D", label: "Desktop chrome", note: "D1 SideNav w-60 + title-adjacent ScanFab vs D3 icon-only rail. Does desktop earn a real sidebar?", render: () => <OptionD /> },
];

const meta = {
  title: "Design System/Spikes/NavHeader",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => (
    <Spike
      title="Nav + Header chrome (IA fixed: 4 tabs + scan FAB)"
      intro="The first screen-chrome spike. IA = 4 tabs (Inicio·Compras·Gastos·Perfil) + scan FAB, fixed (legacy+DM-5 agree). A scan-FAB placement · B header variants · C Perfil treatment · D desktop chrome. Switch platform to judge per device."
      options={OPTIONS}
      {...args}
    />
  ),
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
