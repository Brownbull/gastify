// Phase 6.3 — Scan flow as ordered step stories. First entry: Idle state.
// Sidebar location: `Flows/Scan/01-Idle`.
//
// IdleState is Zustand-coupled (useScanPhase + useScanMode) with a phase guard
// that returns null if phase !== 'idle'. Stories seed the scan store via
// useScanStore.setState() before rendering so the guard passes.

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { IdleState } from './IdleState';
import { useScanStore } from '../../store/useScanStore';

type Platform = 'mobile' | 'tablet' | 'desktop';
type ScanMode = 'single' | 'batch';

interface IdleStateScreenArgs {
  platform: Platform;
  mode: ScanMode;
  /** Whether to show the optional "Scan" button (onStartScan provided). */
  showStartButton: boolean;
}

const PLATFORM_WIDTH: Record<Platform, number | undefined> = {
  mobile: 390,
  tablet: 768,
  desktop: undefined,
};

// Stub translation — returns the key so missing entries are visible.
const stubT = (key: string): string => key;

const IdleStateScreen: React.FC<IdleStateScreenArgs> = ({
  platform,
  mode,
  showStartButton,
}) => {
  // Seed the Zustand store on mount so IdleState's phase guard passes.
  React.useEffect(() => {
    useScanStore.setState({ phase: 'idle', mode });
  }, [mode]);

  const width = PLATFORM_WIDTH[platform];
  return (
    <div
      style={{
        width: width ? `${width}px` : '100%',
        maxWidth: '100%',
        margin: '0 auto',
        padding: 16,
        background: 'var(--bg)',
        minHeight: '100vh',
      }}
    >
      <IdleState
        t={stubT}
        theme="light"
        onStartScan={showStartButton ? () => undefined : undefined}
      />
    </div>
  );
};

const meta: Meta<IdleStateScreenArgs> = {
  title: 'Flows/Scan/01-Idle',
  component: IdleStateScreen,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    platform: {
      name: 'Platform',
      options: ['mobile', 'tablet', 'desktop'],
      control: { type: 'inline-radio' },
    },
    mode: {
      name: 'Scan mode',
      description: 'single = one receipt at a time. batch = queue multiple before processing.',
      options: ['single', 'batch'],
      control: { type: 'inline-radio' },
    },
    showStartButton: {
      name: 'Show Scan button',
      description: 'Renders the optional CTA button (controlled by passing onStartScan prop).',
      control: { type: 'boolean' },
    },
  },
  args: {
    platform: 'mobile',
    mode: 'single',
    showStartButton: true,
  },
};

export default meta;
type Story = StoryObj<IdleStateScreenArgs>;

export const MobileSingle: Story = {
  name: 'Mobile · Single mode',
  args: { platform: 'mobile', mode: 'single', showStartButton: true },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileBatch: Story = {
  name: 'Mobile · Batch mode',
  args: { platform: 'mobile', mode: 'batch', showStartButton: true },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const MobileSingleNoCta: Story = {
  name: 'Mobile · Single (no CTA)',
  args: { platform: 'mobile', mode: 'single', showStartButton: false },
  parameters: { viewport: { defaultViewport: 'mobile' } },
};

export const TabletSingle: Story = {
  name: 'Tablet · Single mode',
  args: { platform: 'tablet', mode: 'single', showStartButton: true },
  parameters: { viewport: { defaultViewport: 'tablet' } },
};

export const DesktopSingle: Story = {
  name: 'Desktop · Single mode',
  args: { platform: 'desktop', mode: 'single', showStartButton: true },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};
