import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const PUBLIC_ROUTES = ["/sign-in"];

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { location } = useRouterState();
  const isPublic = PUBLIC_ROUTES.includes(location.pathname);

  if (isPublic) {
    return <Outlet />;
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  );
}
