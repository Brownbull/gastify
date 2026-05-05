import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodSearchValidator } from '@tanstack/router-zod-adapter';
import { BatchReviewShell } from '../../design-system/screens/BatchReview';

const batchReviewSearchSchema = z.object({
  editing_index: z.number().optional(),
});

export type BatchReviewSearch = z.infer<typeof batchReviewSearchSchema>;

export const Route = createFileRoute('/batch/review')({
  validateSearch: zodSearchValidator(batchReviewSearchSchema),
  component: BatchReviewRoute,
});

function BatchReviewRoute() {
  return <BatchReviewShell />;
}
