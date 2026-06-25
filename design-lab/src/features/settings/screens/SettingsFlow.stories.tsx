import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsFlow } from "./SettingsFlow";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";

/**
 * SettingsFlow — the Ajustes container: a menu (SettingsScreen) that pushes one
 * subview at a time (its back arrow returns to the menu). Each story deep-links a
 * subview via `initialSub` so every settings sub-page is directly inspectable;
 * Menu shows the list (tap a row to navigate). Cards (`CardsSubview`) and Datos y
 * privacidad (`PrivacySubview`) also have their own focused component stories.
 */
const meta: Meta<typeof SettingsFlow> = {
  title: "Features/Settings/Screens/SettingsFlow",
  component: SettingsFlow,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

const at = (initialSub: string | null): Story["render"] =>
  (args, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <SettingsFlow {...args} initialSub={initialSub} />
    </AppSurface>
  );

export const Menu: Story = { render: at(null) };
export const Profile: Story = { render: at("profile") };
export const Subscription: Story = { render: at("subscription") };
export const Notifications: Story = { render: at("notifications") };
export const Limits: Story = { render: at("limits") };
export const Preferences: Story = { render: at("preferences") };
export const Scanning: Story = { render: at("scanning") };
export const Memory: Story = { render: at("memory") };
export const Help: Story = { render: at("help") };
