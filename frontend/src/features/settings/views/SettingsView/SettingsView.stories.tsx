import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, fn } from 'storybook/test';
import { SettingsView } from './SettingsView';
import { Skeleton } from '@/design-system/atoms/Skeleton/Skeleton';
import { ErrorFallback } from '@/design-system/molecules/ErrorFallback/ErrorFallback';
import type { SettingsViewTestOverrides } from './SettingsView';

type Platform = 'mobile' | 'tablet' | 'desktop';
type DataState = 'default' | 'loading' | 'error';

interface SettingsScreenArgs {
  platform: Platform;
  state: DataState;
}

const PLATFORM_WIDTH: Record<Platform, number | undefined> = {
  mobile: 390,
  tablet: 768,
  desktop: undefined,
};

const buildOverrides = (
  state: DataState,
): SettingsViewTestOverrides | undefined => {
  switch (state) {
    case 'default':
      return {
        onSignOut: fn(),
        onWipeDB: fn(),
        onExportAll: fn(),
      };
    case 'loading':
    case 'error':
      return undefined;
    default:
      return undefined;
  }
};

function SettingsScreen({ platform, state }: SettingsScreenArgs) {
  const width = PLATFORM_WIDTH[platform];
  const wrapper = (children: React.ReactNode) => (
    <div
      style={{
        width: width ? `${width}px` : '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      {children}
    </div>
  );

  if (state === 'loading') {
    return wrapper(<SettingsLoadingSkeleton />);
  }

  if (state === 'error') {
    return wrapper(
      <ErrorFallback
        error="No se pudieron cargar los ajustes. Por favor, verifica tu conexión."
        onRetry={fn()}
        onGoHome={fn()}
      />,
    );
  }

  const overrides = buildOverrides(state);
  return wrapper(
    overrides ? <SettingsView _testOverrides={overrides} /> : <SettingsView />,
  );
}

function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-3 p-4" data-testid="settings-loading">
      <Skeleton shape="text" width="160px" height="28px" />
      <Skeleton shape="circle" width="80px" height="80px" />
      <Skeleton shape="text" width="200px" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} shape="list-item" />
      ))}
    </div>
  );
}

const meta: Meta<SettingsScreenArgs> = {
  title: 'Screens/Settings',
  component: SettingsScreen,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    platform: {
      options: ['mobile', 'tablet', 'desktop'],
      control: { type: 'inline-radio' },
    },
    state: {
      options: ['default', 'loading', 'error'],
      control: { type: 'select' },
    },
  },
  args: { platform: 'mobile', state: 'default' },
};

export default meta;
type Story = StoryObj<SettingsScreenArgs>;

// ─── SET-001/003: Mobile · Default (hub) ────────────────────────────────────

export const MobileDefault: Story = {
  name: 'Mobile · Default',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-002: Tablet/Desktop · Default (hub) ────────────────────────────────

export const TabletDefault: Story = {
  name: 'Tablet · Default',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

export const DesktopDefault: Story = {
  name: 'Desktop · Default',
  args: { platform: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

// ─── SET-004: Profile sub-page — mobile ─────────────────────────────────────
// Blocked: Sub-page navigation is internal state (setSubview). Story renders
// the settings hub; user can navigate to sub-pages manually in Storybook.

export const MobileProfile: Story = {
  name: 'Mobile · Profile',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-005: Profile sub-page — tablet/desktop ─────────────────────────────

export const TabletDesktopProfile: Story = {
  name: 'Tablet · Profile',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── SET-006: Preferences sub-page — mobile ─────────────────────────────────

export const MobilePreferences: Story = {
  name: 'Mobile · Preferences',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-007: Preferences sub-page — tablet/desktop ─────────────────────────

export const TabletDesktopPreferences: Story = {
  name: 'Tablet · Preferences',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── SET-008: Scanning sub-page — mobile ────────────────────────────────────

export const MobileScanning: Story = {
  name: 'Mobile · Scanning',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-009: Limits sub-page — mobile ──────────────────────────────────────

export const MobileLimits: Story = {
  name: 'Mobile · Limits',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-010: Limits sub-page — tablet/desktop ──────────────────────────────

export const TabletDesktopLimits: Story = {
  name: 'Tablet · Limits',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── SET-011: Subscription sub-page — mobile ────────────────────────────────

export const MobileSubscription: Story = {
  name: 'Mobile · Subscription',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-012: Subscription sub-page — tablet/desktop ────────────────────────

export const TabletDesktopSubscription: Story = {
  name: 'Tablet · Subscription',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── SET-013: Data sub-page — mobile ────────────────────────────────────────

export const MobileData: Story = {
  name: 'Mobile · Data',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-014: Data sub-page — tablet/desktop ────────────────────────────────

export const TabletDesktopData: Story = {
  name: 'Tablet · Data',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── SET-015: Groups sub-page — mobile ──────────────────────────────────────

export const MobileGroups: Story = {
  name: 'Mobile · Groups',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-016: App sub-page — mobile ─────────────────────────────────────────

export const MobileApp: Story = {
  name: 'Mobile · App',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-017: Account sub-page — mobile ─────────────────────────────────────

export const MobileAccount: Story = {
  name: 'Mobile · Account',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-018: Account sub-page — tablet/desktop ─────────────────────────────

export const TabletDesktopAccount: Story = {
  name: 'Tablet · Account',
  args: { platform: 'tablet', state: 'default' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

// ─── SET-019: Loading state — mobile ────────────────────────────────────────

export const MobileLoading: Story = {
  name: 'Mobile · Loading',
  args: { platform: 'mobile', state: 'loading' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-020: Server error — mobile ─────────────────────────────────────────

export const MobileError: Story = {
  name: 'Mobile · Server Error',
  args: { platform: 'mobile', state: 'error' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retryBtn = canvas.getByRole('button', { name: /reintentar/i });
    await expect(retryBtn).toBeInTheDocument();
  },
};

// ─── SET-021: Sub-page saving state — mobile ────────────────────────────────
// Blocked: Saving state is internal to each sub-page component.

export const MobileSaving: Story = {
  name: 'Mobile · Saving',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-022: Sub-page validation error — mobile ────────────────────────────
// Blocked: Validation state is internal to each sub-page component.

export const MobileValidationError: Story = {
  name: 'Mobile · Validation Error',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-023: Onboarding step 1 (welcome) — mobile ──────────────────────────
// Blocked: Onboarding flow component does not yet exist.

export const MobileOnboardingWelcome: Story = {
  name: 'Mobile · Onboarding Welcome',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-024: Onboarding step 2 (preferences) — mobile ─────────────────────

export const MobileOnboardingPreferences: Story = {
  name: 'Mobile · Onboarding Preferences',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-025: Onboarding step 3 (first scan) — mobile ──────────────────────

export const MobileOnboardingFirstScan: Story = {
  name: 'Mobile · Onboarding First Scan',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-026: Onboarding complete — mobile ──────────────────────────────────

export const MobileOnboardingComplete: Story = {
  name: 'Mobile · Onboarding Complete',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

// ─── SET-027: Data export (window.print) — desktop ──────────────────────────

export const DesktopDataExport: Story = {
  name: 'Desktop · Data Export',
  args: { platform: 'desktop', state: 'default' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

// ─── SET-028: Onboarding → Dashboard full flow ──────────────────────────────
// Human-authored: Cross-feature interactivity requiring navigation from
// onboarding completion to Dashboard.

export const OnboardingToDashboard: Story = {
  name: 'Mobile · Onboarding to Dashboard',
  args: { platform: 'mobile', state: 'default' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};
