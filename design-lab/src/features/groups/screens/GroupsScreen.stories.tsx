import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { GroupsScreen } from "./GroupsScreen";
import { GroupDetailScreen } from "./GroupDetailScreen";
import { SAMPLE_GROUPS, type Group } from "../model/groupFixtures";

/**
 * Features/Groups/Screens/GroupsScreen — the Grupos feature, reached from the
 * avatar dropdown (peer to Ajustes). `Default` is the hub→detail flow; `Detail`
 * shows a group's shared dashboard in isolation; `Empty` is first-run; `FromAvatar`
 * proves the real reach (open the avatar dropdown → Grupos).
 */
const meta: Meta = {
  title: "Features/Groups/Screens/GroupsScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

function GruposFlow({ platform, onClose }: { platform: Platform; onClose?: () => void }) {
  const [openGroup, setOpenGroup] = useState<Group | null>(null);
  if (openGroup) {
    return (
      <GroupDetailScreen
        group={openGroup}
        platform={platform}
        onBack={() => setOpenGroup(null)}
        onShare={() => {}}
        onLeave={() => setOpenGroup(null)}
        onDelete={() => setOpenGroup(null)}
      />
    );
  }
  return <GroupsScreen onBack={onClose} onOpenGroup={setOpenGroup} onCreate={() => {}} />;
}

export const Default: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <GruposFlow platform={platform} onClose={() => {}} />
      </AppSurface>
    );
  },
};

/** Owner view (SAMPLE_GROUPS[0]): tap a member to manage, the visibility toggle, and "Eliminar grupo". */
export const Detail: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <GroupDetailScreen group={SAMPLE_GROUPS[0]} platform={platform} onBack={() => {}} onShare={() => {}} onLeave={() => {}} onDelete={() => {}} />
      </AppSurface>
    );
  },
};

/** Member view (SAMPLE_GROUPS[1]): no member management / visibility toggle — just your consent + "Salir del grupo". */
export const DetailAsMember: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <GroupDetailScreen group={SAMPLE_GROUPS[1]} platform={platform} onBack={() => {}} onShare={() => {}} onLeave={() => {}} onDelete={() => {}} />
      </AppSurface>
    );
  },
};

export const Empty: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <GroupsScreen groups={[]} onBack={() => {}} onCreate={() => {}} />
      </AppSurface>
    );
  },
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
            if (k === "groups") setOpen(true);
          }}
          overlay={open ? <GruposFlow platform={platform} onClose={() => setOpen(false)} /> : undefined}
        >
          <div className="flex h-full flex-col items-center justify-center gap-gt-8 px-gt-16 text-center">
            <p className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Abre Grupos desde el avatar</p>
            <p className="text-gt-sm text-gt-ink-3">
              Toca el avatar (arriba a la derecha) → <b>Grupos</b>.
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
