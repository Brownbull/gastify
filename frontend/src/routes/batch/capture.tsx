import { createFileRoute } from '@tanstack/react-router';
import { BatchCaptureShell } from '../../design-system/screens/BatchCapture';

export const Route = createFileRoute('/batch/capture')({
  component: BatchCaptureRoute,
});

function BatchCaptureRoute() {
  return <BatchCaptureShell />;
}
