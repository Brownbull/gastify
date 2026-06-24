import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { InviteJoinScreen } from "./InviteJoinScreen";
import { GroupDetailScreen } from "./GroupDetailScreen";
import { SAMPLE_GROUPS } from "../model/groupFixtures";

/**
 * Features/Groups/Screens/InviteJoinScreen — the recipient side of an invite link
 * (GET /invites/:token preview → POST join). `Default` previews + joins;
 * `Expired` is the invalid-token error; `JoinFlow` runs join → open the group.
 */
const meta: Meta = {
  title: "Features/Groups/Screens/InviteJoinScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <InviteJoinScreen group={SAMPLE_GROUPS[0]} inviterName="Camila Rojas" onJoin={() => {}} onViewGroup={() => {}} onClose={() => {}} />
    </AppSurface>
  ),
};

export const Expired: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <InviteJoinScreen group={SAMPLE_GROUPS[0]} inviterName="Camila Rojas" expired onClose={() => {}} />
    </AppSurface>
  ),
};

export const JoinFlow: Story = {
  render: (_a, { globals }) => {
    const platform = platformFromGlobals(globals);
    function Flow() {
      const [open, setOpen] = useState(false);
      if (open) return <GroupDetailScreen group={SAMPLE_GROUPS[0]} platform={platform} onBack={() => setOpen(false)} />;
      return <InviteJoinScreen group={SAMPLE_GROUPS[0]} inviterName="Camila Rojas" onViewGroup={() => setOpen(true)} onClose={() => {}} />;
    }
    return (
      <AppSurface platform={platform}>
        <Flow />
      </AppSurface>
    );
  },
};
