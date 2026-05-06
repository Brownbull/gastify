import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodSearchValidator } from '@tanstack/router-zod-adapter';
import { ScanModeShell } from '../design-system/screens/Scan';

const scanSearchSchema = z.object({
  currency: z.string().optional(),
  receipt_type: z.string().optional(),
});

export type ScanSearch = z.infer<typeof scanSearchSchema>;

export const Route = createFileRoute('/scan')({
  validateSearch: zodSearchValidator(scanSearchSchema),
  component: ScanRoute,
});

function ScanRoute() {
  return <ScanModeShell layout="desktop" />;
}
