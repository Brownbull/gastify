import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { PrivacySubview } from "./PrivacySubview";

/**
 * Features/Settings/Screens/PrivacySubview — "Datos y privacidad": data-access
 * summary, per-purpose consent toggles, the activity/audit log, JSON export and
 * account deletion. Grounded on the backend /consent + /privacy (Ley 21.719 / GDPR).
 */
const meta: Meta = {
  title: "Features/Settings/Screens/PrivacySubview",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <PrivacySubview onBack={() => {}} />
    </AppSurface>
  ),
};
