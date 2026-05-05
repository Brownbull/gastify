import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodSearchValidator } from '@tanstack/router-zod-adapter';
import { ItemsShell } from '../design-system/screens/Items';

const itemsSearchSchema = z.object({
  category: z.string().optional(),
  item_group: z.string().optional(),
  item_category: z.string().optional(),
  merchant: z.string().optional(),
  temporal_level: z.enum(['month', 'year', 'quarter']).optional(),
  year: z.string().optional(),
  month: z.string().optional(),
  quarter: z.string().optional(),
});

export type ItemsSearch = z.infer<typeof itemsSearchSchema>;

export const Route = createFileRoute('/items')({
  validateSearch: zodSearchValidator(itemsSearchSchema),
  component: ItemsRoute,
});

function ItemsRoute() {
  return <ItemsShell layout="desktop" />;
}
