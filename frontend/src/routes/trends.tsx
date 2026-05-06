import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodSearchValidator } from '@tanstack/router-zod-adapter';
import { AnalyticsShell } from '../design-system/screens/Analytics';

const trendsSearchSchema = z.object({
  level: z.enum(['year', 'quarter', 'month', 'week', 'day']).optional(),
  year: z.string().optional(),
  quarter: z.string().optional(),
  month: z.string().optional(),
  week: z.string().optional(),
  day: z.string().optional(),
  cLevel: z.enum(['all', 'category', 'group', 'subcategory']).optional(),
  category: z.string().optional(),
  group: z.string().optional(),
  subcategory: z.string().optional(),
  chartMode: z.enum(['aggregation', 'comparison']).optional(),
  drillMode: z.enum(['temporal', 'category']).optional(),
});

export type TrendsSearch = z.infer<typeof trendsSearchSchema>;

export const Route = createFileRoute('/trends')({
  validateSearch: zodSearchValidator(trendsSearchSchema),
  component: TrendsRoute,
});

function TrendsRoute() {
  return <AnalyticsShell layout="desktop" />;
}
