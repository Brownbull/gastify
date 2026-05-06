/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { act, render } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useRouterState,
} from '@tanstack/react-router';
import { viewToPath, pathToView } from '../routeMapping';
import type { View } from '@app/types';

// =============================================================================
// Test Router Factory
// =============================================================================

function createTestRouter(initialPath = '/') {
  const rootRoute = createRootRoute({
    component: () => {
      const pathname = useRouterState({ select: (s) => s.location.pathname });
      return <div data-testid="current-path">{pathname}</div>;
    },
  });

  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <div>Dashboard</div> });
  const historyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/history', component: () => <div>History</div> });
  const itemsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/items', component: () => <div>Items</div> });
  const trendsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/trends', component: () => <div>Trends</div> });
  const insightsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/insights', component: () => <div>Insights</div> });
  const reportsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/reports', component: () => <div>Reports</div> });
  const alertsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/alerts', component: () => <div>Alerts</div> });
  const recentScansRoute = createRoute({ getParentRoute: () => rootRoute, path: '/recent-scans', component: () => <div>RecentScans</div> });
  const scanRoute = createRoute({ getParentRoute: () => rootRoute, path: '/scan', component: () => <div>Scan</div> });
  const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: () => <div>Settings</div> });
  const batchCaptureRoute = createRoute({ getParentRoute: () => rootRoute, path: '/batch/capture', component: () => <div>BatchCapture</div> });
  const batchReviewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/batch/review', component: () => <div>BatchReview</div> });

  const routeTree = rootRoute.addChildren([
    indexRoute, historyRoute, itemsRoute, trendsRoute, insightsRoute,
    reportsRoute, alertsRoute, recentScansRoute, scanRoute, settingsRoute,
    batchCaptureRoute, batchReviewRoute,
  ]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

// =============================================================================
// 1. router.navigate({ to }) replaces setView
// =============================================================================

describe('navigate replaces setView', () => {
  const viewTargets: [View, string][] = [
    ['dashboard', '/'],
    ['history', '/history'],
    ['items', '/items'],
    ['trends', '/trends'],
    ['insights', '/insights'],
    ['reports', '/reports'],
    ['alerts', '/alerts'],
    ['recent-scans', '/recent-scans'],
    ['scan', '/scan'],
    ['batch-capture', '/batch/capture'],
    ['batch-review', '/batch/review'],
    ['settings', '/settings'],
  ];

  it.each(viewTargets)('navigate to "%s" reaches "%s"', async (view, expectedPath) => {
    const router = createTestRouter('/');
    await router.load();

    await router.navigate({ to: viewToPath(view) });
    await router.invalidate();

    expect(router.state.location.pathname).toBe(expectedPath);
  });

  it('navigate({ to: viewToPath("transaction-editor") }) goes to /scan', async () => {
    const router = createTestRouter('/');
    await router.load();

    await router.navigate({ to: viewToPath('transaction-editor') });
    await router.invalidate();

    expect(router.state.location.pathname).toBe('/scan');
  });
});

// =============================================================================
// 2. router.history.back() replaces navigateBack
// =============================================================================

describe('router.history.back() replaces navigateBack', () => {
  it('goes back to previous page after navigation', async () => {
    const router = createTestRouter('/');
    await router.load();

    await router.navigate({ to: '/history' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/history');

    router.history.back();
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/');
  });

  it('handles multi-step back navigation', async () => {
    const router = createTestRouter('/');
    await router.load();

    await router.navigate({ to: '/trends' });
    await router.invalidate();
    await router.navigate({ to: '/history' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/history');

    router.history.back();
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/trends');

    router.history.back();
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/');
  });
});

// =============================================================================
// 3. viewToPath + navigate — view-to-URL conversion roundtrip
// =============================================================================

describe('viewToPath + navigate integration', () => {
  it('navigating via viewToPath produces correct URL and pathToView recovers the view', async () => {
    const router = createTestRouter('/');
    await router.load();

    const views: View[] = ['history', 'items', 'trends', 'insights', 'reports', 'batch-capture', 'batch-review'];

    for (const view of views) {
      await router.navigate({ to: viewToPath(view) });
      await router.invalidate();
      const recoveredView = pathToView(router.state.location.pathname);
      expect(recoveredView).toBe(view);
    }
  });
});

// =============================================================================
// 4. Search params — distView for pendingDistributionView
// =============================================================================

describe('distView search param (pendingDistributionView replacement)', () => {
  it('navigate to /trends with distView search param', async () => {
    const router = createTestRouter('/');
    await router.load();

    await router.navigate({ to: '/trends', search: { distView: 'donut' } as any });
    await router.invalidate();

    expect(router.state.location.pathname).toBe('/trends');
    expect((router.state.location.search as any).distView).toBe('donut');
  });

  it('replace: true updates URL without adding history entry', async () => {
    const router = createTestRouter('/');
    await router.load();

    // Navigate to /trends (push)
    await router.navigate({ to: '/trends' });
    await router.invalidate();

    // Replace with distView param — should NOT add a new history entry
    await router.navigate({ to: '/trends', search: { distView: 'treemap' } as any, replace: true });
    await router.invalidate();

    expect(router.state.location.pathname).toBe('/trends');
    expect((router.state.location.search as any).distView).toBe('treemap');

    // Back should go to / (skipping the replaced entry)
    router.history.back();
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/');
  });

  it('distView is preserved in browser history on back navigation', async () => {
    const router = createTestRouter('/');
    await router.load();

    await router.navigate({ to: '/trends', search: { distView: 'donut' } as any });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/trends');

    await router.navigate({ to: '/history' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/history');

    router.history.back();
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/trends');
    expect((router.state.location.search as any).distView).toBe('donut');
  });
});

// =============================================================================
// 5. Direct router.navigate (for non-React contexts like processScan)
// =============================================================================

describe('router.navigate() for non-React contexts', () => {
  it('router.navigate({ to: "/" }) navigates to dashboard', async () => {
    const router = createTestRouter('/scan');
    await router.load();

    await router.navigate({ to: '/' });
    await router.invalidate();

    expect(router.state.location.pathname).toBe('/');
  });

  it('router.navigate with viewToPath works for all views', async () => {
    const router = createTestRouter('/');
    await router.load();

    const targets: View[] = ['history', 'trends', 'reports', 'items', 'batch-review'];
    for (const view of targets) {
      await router.navigate({ to: viewToPath(view) });
      await router.invalidate();
      expect(router.state.location.pathname).toBe(viewToPath(view));
    }
  });
});

// =============================================================================
// 6. Edge cases from historical bugs
// =============================================================================

describe('edge cases — historical bug prevention', () => {
  it('navigating to same route does not crash', async () => {
    const router = createTestRouter('/history');
    await router.load();

    await router.navigate({ to: '/history' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/history');
  });

  it('rapid sequential navigations resolve to final target', async () => {
    const router = createTestRouter('/');
    await router.load();

    router.navigate({ to: '/history' });
    router.navigate({ to: '/trends' });
    router.navigate({ to: '/items' });
    await router.navigate({ to: '/reports' });
    await router.invalidate();

    expect(router.state.location.pathname).toBe('/reports');
  });

  it('back after navigateBack-equivalent does not break history stack', async () => {
    const router = createTestRouter('/');
    await router.load();

    await router.navigate({ to: '/trends' });
    await router.invalidate();
    await router.navigate({ to: '/history' });
    await router.invalidate();

    router.history.back();
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/trends');

    await router.navigate({ to: '/items' });
    await router.invalidate();

    router.history.back();
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/trends');
  });

  it('batch flow: scan → batch-capture → batch-review → dashboard', async () => {
    const router = createTestRouter('/scan');
    await router.load();

    await router.navigate({ to: '/batch/capture' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/batch/capture');

    await router.navigate({ to: '/batch/review' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/batch/review');

    await router.navigate({ to: '/' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/');
  });

  it('analytics drill-down: trends → history (with back to trends)', async () => {
    const router = createTestRouter('/');
    await router.load();

    await router.navigate({ to: '/trends', search: { distView: 'treemap' } as any });
    await router.invalidate();

    await router.navigate({ to: '/history' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/history');

    await router.navigate({ to: '/items' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/items');

    router.history.back();
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/history');

    router.history.back();
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/trends');
    expect((router.state.location.search as any).distView).toBe('treemap');
  });

  it('profile dropdown navigation from any view', async () => {
    const router = createTestRouter('/trends');
    await router.load();

    await router.navigate({ to: '/settings' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/settings');

    await router.navigate({ to: '/insights' });
    await router.invalidate();
    expect(router.state.location.pathname).toBe('/insights');
  });
});

// =============================================================================
// 7. URL-derived view (replaces useCurrentView from Zustand)
// =============================================================================

describe('URL-derived view replaces useCurrentView', () => {
  it('pathToView gives correct view for each route', async () => {
    const paths = ['/', '/history', '/items', '/trends', '/insights', '/reports',
      '/alerts', '/recent-scans', '/scan', '/batch/capture', '/batch/review', '/settings'];

    for (const path of paths) {
      const router = createTestRouter(path);
      await router.load();
      const view = pathToView(router.state.location.pathname);
      expect(view).not.toBeNull();
    }
  });

  it('view updates reactively when URL changes (via RouterProvider)', async () => {
    const viewHistory: (string | null)[] = [];

    const rootRoute = createRootRoute({
      component: () => {
        const pathname = useRouterState({ select: (s) => s.location.pathname });
        const view = pathToView(pathname);
        viewHistory.push(view);
        return <div data-testid="view">{view}</div>;
      },
    });

    const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <div>Dashboard</div> });
    const trendsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/trends', component: () => <div>Trends</div> });
    const historyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/history', component: () => <div>History</div> });

    const routeTree = rootRoute.addChildren([indexRoute, trendsRoute, historyRoute]);

    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    await router.load();

    const { unmount } = render(<RouterProvider router={router} />);

    await act(async () => {
      await router.navigate({ to: '/trends' });
      await router.invalidate();
    });

    await act(async () => {
      await router.navigate({ to: '/history' });
      await router.invalidate();
    });

    expect(viewHistory).toContain('dashboard');
    expect(viewHistory).toContain('trends');
    expect(viewHistory).toContain('history');

    unmount();
  });
});
