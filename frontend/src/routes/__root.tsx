import { createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import App from '../App';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  // Bridge phase: App.tsx handles all rendering via Zustand view switch.
  // Outlet deliberately omitted — child route components don't render yet.
  return <App />;
}
