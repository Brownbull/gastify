// Reports screen story — fifth self-contained-screen example.
// ReportsView reads transactions via useAuth + usePaginatedTransactions +
// useRecentScans (backed by mocked Firestore that preview.tsx bootstraps).
//
// Required props that aren't data hooks: { t, theme }. Rendered body is
// already hardcoded Spanish strings ("Resumen", "Semanal", "Mensual",
// "Trimestral", "Anual", and the Spanish empty-section placeholders), so an
// empty-string `t` stub is safe — t() is forwarded to ProfileDropdown +
// ReportDetailOverlay, both of which start closed. Verified via the standard
// 3-part gate (iframe screenshot, translation-key leak regex, visual spot).

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReportsView } from './ReportsView';

type Platform = 'mobile' | 'tablet' | 'desktop';

interface ReportsScreenArgs {
  platform: Platform;
}

const PLATFORM_WIDTH: Record<Platform, number | undefined> = {
  mobile: 390,
  tablet: 768,
  desktop: undefined,
};

const stubT = (_key: string) => '';

const ReportsScreen: React.FC<ReportsScreenArgs> = ({ platform }) => {
  const width = PLATFORM_WIDTH[platform];
  return (
    <div
      style={{
        width: width ? `${width}px` : '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      <ReportsView t={stubT} theme="normal" />
    </div>
  );
};

const meta: Meta<ReportsScreenArgs> = {
  title: 'Screens/Reports',
  component: ReportsScreen,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    platform: {
      name: 'Platform',
      description: 'Viewport-frame width (mobile 390 / tablet 768 / desktop fluid).',
      options: ['mobile', 'tablet', 'desktop'],
      control: { type: 'inline-radio' },
    },
  },
  args: {
    platform: 'mobile',
  },
};

export default meta;
type Story = StoryObj<ReportsScreenArgs>;

export const MobileDefault: Story = {
  name: 'Mobile · Default',
  args: { platform: 'mobile' },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const TabletDefault: Story = {
  name: 'Tablet · Default',
  args: { platform: 'tablet' },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

export const DesktopDefault: Story = {
  name: 'Desktop · Default',
  args: { platform: 'desktop' },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};
