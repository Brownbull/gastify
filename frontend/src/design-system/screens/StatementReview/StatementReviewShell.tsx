import { Button } from '../../atoms/Button';

type StatementReviewState = 'default' | 'confirming';

interface ParsedTransaction {
  id: number;
  date: string;
  merchant: string;
  amount: string;
}

interface StatementReviewShellProps {
  state?: StatementReviewState;
  transactions?: readonly ParsedTransaction[];
  confirmLabel?: string;
  rejectLabel?: string;
  summaryLabel?: string;
}

const MOCK_TRANSACTIONS: readonly ParsedTransaction[] = [
  { id: 1, date: '28 Apr', merchant: 'Jumbo Costanera Center', amount: '$24.890' },
  { id: 2, date: '27 Apr', merchant: 'Copec Av. Providencia', amount: '$45.000' },
  { id: 3, date: '26 Apr', merchant: 'Netflix', amount: '$6.990' },
  { id: 4, date: '25 Apr', merchant: 'Uber Eats', amount: '$12.350' },
  { id: 5, date: '24 Apr', merchant: 'Farmacia Cruz Verde', amount: '$8.790' },
] as const;

export function StatementReviewShell({
  state = 'default',
  transactions = MOCK_TRANSACTIONS,
  confirmLabel = 'Confirm all',
  rejectLabel = 'Reject selection',
  summaryLabel = '15 transactions found',
}: StatementReviewShellProps) {
  const isBusy = state === 'confirming';

  return (
    <div
      style={{
        padding: '24px 16px',
        backgroundColor: 'var(--background)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '4px',
        }}
      >
        Statement review
      </h1>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          marginBottom: '24px',
        }}
      >
        {summaryLabel}
      </p>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {transactions.map((tx) => (
          <div
            key={tx.id}
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {tx.merchant}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {tx.date}
              </p>
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {tx.amount}
            </p>
          </div>
        ))}
      </div>

      {/* Bulk action bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <Button
          style={{ flex: 1 }}
          loading={isBusy}
          disabled={isBusy}
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" style={{ flex: 1 }} disabled={isBusy}>
          {rejectLabel}
        </Button>
      </div>
    </div>
  );
}
