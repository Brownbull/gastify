import { createFileRoute } from '@tanstack/react-router';
import { RecentScansShell } from '../design-system/screens/RecentScans';

export const Route = createFileRoute('/recent-scans')({
  component: RecentScansRoute,
});

function RecentScansRoute() {
  return <RecentScansShell />;
}
