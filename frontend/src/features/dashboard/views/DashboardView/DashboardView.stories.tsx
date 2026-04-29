// Phase 6 milestone story — `Screens/Dashboard`.
// First end-to-end deliverable per docs/MOCKUP-REWORK-HANDOFF.md §3:
// "Dashboard, Mobile (390×844), Normal theme, Light mode, with real Transaction
// data shape." Mounts the actual DashboardView component with mocked Firestore
// data flowing through the existing repositories (preview.tsx bootstraps the
// Firebase mocks before any story imports).

import * as React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { DashboardView } from './DashboardView';
import { useHistoryFiltersInit } from '@shared/hooks';

const meta: Meta<typeof DashboardView> = {
  title: 'Screens/Dashboard',
  component: DashboardView,
  parameters: {
    viewport: { defaultViewport: 'mobile' },
    layout: 'fullscreen',
  },
};

export default meta;

// App-level wrapper mirroring DashboardViewWithFilters in viewRenderers.tsx —
// initializes the history-filters Zustand store on mount, then renders the view.
const DashboardScreen = () => {
  useHistoryFiltersInit();
  return <DashboardView />;
};

export const Default: StoryFn = () => <DashboardScreen />;
