import type { Meta, StoryObj } from "@storybook/react-vite";
import { BellIcon, MenuIcon } from "../assets/icons";
import { AppSurface } from "./AppSurface";
import {
  AppHeader,
  BottomNav,
  NavDrawer,
  ProfileButton,
  SideNav,
  currentNavCatalog,
  redesignedNavCatalog,
} from "./AppShell";

/**
 * Shell pieces in isolation — the parts that screens assemble. Both nav
 * catalogs render here while the IA decision (Phase 3) is open.
 */
const meta = {
  title: "Design System/Organisms/App Shell",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Header: Story = {
  render: () => (
    <div className="max-w-md bg-gt-bg p-6">
      <AppHeader
        leading={<MenuIcon className="h-5 w-5 text-gt-ink-2" />}
        trailing={
          <>
            <BellIcon className="h-5 w-5 text-gt-ink-2" />
            <ProfileButton />
          </>
        }
      />
    </div>
  ),
};

export const BottomNavRedesigned: Story = {
  name: "Bottom Nav (5-tab catalog)",
  render: () => (
    <div className="mx-auto w-[390px] bg-gt-bg p-6">
      <BottomNav items={redesignedNavCatalog} active="inicio" />
    </div>
  ),
};

export const SideNavCurrent: Story = {
  name: "Side Nav (11-entry catalog)",
  render: () => (
    <div className="flex h-[640px] bg-gt-bg p-6">
      <SideNav items={currentNavCatalog} active="dashboard" />
    </div>
  ),
};

export const SideNavRedesigned: Story = {
  name: "Side Nav (5-tab catalog)",
  render: () => (
    <div className="flex h-[520px] bg-gt-bg p-6">
      <SideNav items={redesignedNavCatalog} active="inicio" />
    </div>
  ),
};

export const Drawer: Story = {
  render: () => (
    <div className="bg-gt-bg p-8">
      <AppSurface platform="mobile" className="relative">
        <div className="flex-1" />
        <NavDrawer items={currentNavCatalog} active="dashboard" />
      </AppSurface>
    </div>
  ),
};
