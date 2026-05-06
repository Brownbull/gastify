import * as React from 'react';
import type { Decorator } from '@storybook/react-vite';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';

const StoryContext = React.createContext<React.ComponentType>(() => null);

function RootRouteComponent() {
  const Story = React.useContext(StoryContext);
  return (
    <>
      <Story />
      <Outlet />
    </>
  );
}

const ROUTE_PATHS = [
  '/',
  '/history',
  '/items',
  '/trends',
  '/insights',
  '/reports',
  '/alerts',
  '/recent-scans',
  '/scan',
  '/statement-scan',
  '/settings',
  '/settings/profile',
  '/settings/preferences',
  '/settings/scanning',
  '/settings/limits',
  '/settings/subscription',
  '/settings/data',
  '/settings/groups',
  '/settings/app',
  '/settings/account',
  '/transactions',
  '/batch/capture',
  '/batch/review',
] as const;

function buildStorybookRouter() {
  const rootRoute = createRootRoute({
    component: RootRouteComponent,
  });

  const childRoutes = ROUTE_PATHS.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    }),
  );

  const routeTree = rootRoute.addChildren(childRoutes);

  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
}

const storybookRouter = buildStorybookRouter();

export const withRouter: Decorator = (Story) => {
  return (
    <StoryContext.Provider value={Story as unknown as React.ComponentType}>
      <RouterProvider router={storybookRouter as any} />
    </StoryContext.Provider>
  );
};
