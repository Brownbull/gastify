import { createFileRoute } from '@tanstack/react-router';
import { StatementUploadShell } from '../design-system/screens/StatementUpload';

export const Route = createFileRoute('/statement-scan')({
  component: StatementScanRoute,
});

function StatementScanRoute() {
  return <StatementUploadShell />;
}
