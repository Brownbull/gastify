import { createFileRoute } from '@tanstack/react-router';
import { DashboardShell } from '../design-system/screens/Dashboard';

export const Route = createFileRoute('/')({
  component: DashboardRoute,
});

function DashboardRoute() {
  return <DashboardShell viewport="desktop" />;
}
