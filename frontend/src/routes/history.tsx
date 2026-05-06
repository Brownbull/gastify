import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodSearchValidator } from '@tanstack/router-zod-adapter';
import { HistoryShell } from '../design-system/screens/History';

const historySearchSchema = z.object({
  tLevel: z.enum(['all', 'year', 'quarter', 'month', 'week', 'day']).optional(),
  tYear: z.string().optional(),
  tQuarter: z.string().optional(),
  tMonth: z.string().optional(),
  tWeek: z.string().optional(),
  tDay: z.string().optional(),
  cLevel: z.enum(['all', 'category', 'group', 'subcategory']).optional(),
  cCategory: z.string().optional(),
  cGroup: z.string().optional(),
  cSubcategory: z.string().optional(),
  cDrillPath: z.string().optional(),
  lCountry: z.string().optional(),
  lCity: z.string().optional(),
  lCities: z.string().optional(),
  sourceView: z.enum(['donut', 'treemap']).optional(),
});

export type HistorySearch = z.infer<typeof historySearchSchema>;

export const Route = createFileRoute('/history')({
  validateSearch: zodSearchValidator(historySearchSchema),
  component: HistoryRoute,
});

function HistoryRoute() {
  return <HistoryShell layout="desktop" />;
}
