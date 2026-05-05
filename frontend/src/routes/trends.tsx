import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodSearchValidator } from '@tanstack/router-zod-adapter';
import { AnalyticsShell } from '../design-system/screens/Analytics';

const trendsSearchSchema = z.object({
  month: z.string().optional(),
  year: z.string().optional(),
  chart_mode: z.string().optional(),
  drill_down_mode: z.string().optional(),
  category: z.string().optional(),
});

export type TrendsSearch = z.infer<typeof trendsSearchSchema>;

export const Route = createFileRoute('/trends')({
  validateSearch: zodSearchValidator(trendsSearchSchema),
  component: TrendsRoute,
});

function TrendsRoute() {
  return <AnalyticsShell layout="desktop" />;
}
