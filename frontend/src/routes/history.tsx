import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodSearchValidator } from '@tanstack/router-zod-adapter';
import { HistoryShell } from '../design-system/screens/History';

const historySearchSchema = z.object({
  category: z.string().optional(),
  group: z.string().optional(),
  temporal_level: z.enum(['month', 'year', 'quarter']).optional(),
  year: z.string().optional(),
  month: z.string().optional(),
  quarter: z.string().optional(),
  source_view: z.enum(['donut', 'treemap']).optional(),
});

export type HistorySearch = z.infer<typeof historySearchSchema>;

export const Route = createFileRoute('/history')({
  validateSearch: zodSearchValidator(historySearchSchema),
  component: HistoryRoute,
});

function HistoryRoute() {
  return <HistoryShell layout="desktop" />;
}
