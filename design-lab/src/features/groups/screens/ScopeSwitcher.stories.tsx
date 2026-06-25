import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import type { NavScope } from "@design-system/organisms/Nav";
import { GroupAvatar } from "@design-system/atoms/GroupAvatar";
import { MemberCluster } from "../components/MemberCluster";
import { ShareTransactionsScreen } from "./ShareTransactionsScreen";
import { ScanModeChooserScreen } from "@features/scan/screens/ScanModeChooserScreen";
import { SAMPLE_GROUPS } from "../model/groupFixtures";
import { clp } from "@lib/transactionFixtures";

/**
 * Features/Groups/Screens/ScopeSwitcher — the workspace scope switcher. The
 * top-left logo (mobile header / desktop side rail) opens a Personal/groups menu;
 * picking a group tints the nav chrome with the group's accent and tailors the
 * whole app to that group's shared expenses. Toggle platform in the toolbar.
 */
const PERSONAL: NavScope = { id: "personal", name: "Personal" };
const SCOPES: NavScope[] = [PERSONAL, ...SAMPLE_GROUPS.map((g) => ({ id: g.id, name: g.name, color: g.color, icon: g.icon }))];

const meta: Meta = {
  title: "Features/Groups/Screens/ScopeSwitcher",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

function ScopeContent({ scopeId }: { scopeId: string }) {
  const group = SAMPLE_GROUPS.find((g) => g.id === scopeId);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-gt-12 px-gt-16 text-center">
      <div
        className="w-full max-w-sm rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-16 shadow-gt-sm"
        style={group ? { backgroundColor: `${group.color}14` } : undefined}
      >
        <p className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
          {group ? "Espacio de grupo · este mes" : "Espacio personal · este mes"}
        </p>
        <p className="mt-gt-2 font-gt-display text-gt-3xl font-extrabold text-gt-primary">
          {group ? clp(group.sharedTotal) : "$385.000"}
        </p>
        {group ? (
          <div className="mt-gt-8 flex items-center justify-center gap-gt-8">
            <GroupAvatar icon={group.icon} color={group.color} size="sm" />
            <MemberCluster members={group.members} />
          </div>
        ) : null}
        <p className="mt-gt-8 text-gt-sm font-medium text-gt-ink-2">
          {group
            ? "Transacciones, reportes y todo lo demás muestran los gastos compartidos de este grupo."
            : "Tus gastos personales. Cambia de espacio desde el logo para ver un grupo."}
        </p>
      </div>
      <p className="text-gt-sm font-bold text-gt-ink-3">
        Toca el <b className="text-gt-ink">logo</b> (arriba a la izquierda) → elige un espacio.
      </p>
    </div>
  );
}

function Demo({ platform }: { platform: Platform }) {
  const [scopeId, setScopeId] = useState("g-familia");
  const [active, setActive] = useState("home");
  const scope = SCOPES.find((s) => s.id === scopeId) ?? PERSONAL;
  return (
    <AppScaffold
      platform={platform}
      active={active}
      onSelect={setActive}
      scope={scope}
      scopes={SCOPES}
      onScopeSelect={setScopeId}
      onScan={() => {}}
    >
      <ScopeContent scopeId={scopeId} />
    </AppScaffold>
  );
}

export const Default: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <Demo platform={platform} />
      </AppSurface>
    );
  },
};

/**
 * The add action is scope-aware: in a GROUP scope the FAB opens the full-page
 * "Compartir gastos" flow (you share existing personal transactions — you can't
 * scan straight into a group); in Personal it opens the normal scan chooser.
 * Default scope is Familia González — tap the FAB; switch to Personal via the
 * logo to see the chooser instead.
 */
function AddInScopeDemo({ platform }: { platform: Platform }) {
  const [scopeId, setScopeId] = useState("g-familia");
  const [active, setActive] = useState("home");
  const [addOpen, setAddOpen] = useState(false);
  const scope = SCOPES.find((s) => s.id === scopeId) ?? PERSONAL;
  const group = SAMPLE_GROUPS.find((g) => g.id === scopeId);
  const close = () => setAddOpen(false);
  return (
    <AppScaffold
      platform={platform}
      active={active}
      onSelect={setActive}
      scope={scope}
      scopes={SCOPES}
      onScopeSelect={(id) => { setScopeId(id); close(); }}
      onScan={() => setAddOpen(true)}
      overlay={
        addOpen ? (
          group ? (
            <ShareTransactionsScreen groupName={group.name} platform={platform} onBack={close} onShared={() => {}} />
          ) : (
            <ScanModeChooserScreen onClose={close} onSingle={close} onStatement={close} onManual={close} />
          )
        ) : undefined
      }
    >
      <ScopeContent scopeId={scopeId} />
    </AppScaffold>
  );
}

export const AddInScope: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <AddInScopeDemo platform={platform} />
      </AppSurface>
    );
  },
};
