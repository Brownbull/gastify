import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodSearchValidator } from '@tanstack/router-zod-adapter';
import { TransactionEditorShell } from '../../design-system/screens/TransactionEditor';

const transactionSearchSchema = z.object({
  mode: z.enum(['edit', 'view']).default('view'),
  from: z.string().optional(),
});

export type TransactionSearch = z.infer<typeof transactionSearchSchema>;

export const Route = createFileRoute('/transactions/$transactionId')({
  validateSearch: zodSearchValidator(transactionSearchSchema),
  component: TransactionRoute,
});

function TransactionRoute() {
  const { mode } = Route.useSearch();
  return (
    <TransactionEditorShell
      layout="desktop"
      state={mode === 'edit' ? 'default' : 'default'}
    />
  );
}
