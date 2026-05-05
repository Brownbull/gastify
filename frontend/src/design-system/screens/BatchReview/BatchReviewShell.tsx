import { ScanStatusIndicator } from '../../molecules/ScanStatusIndicator';
import { Button } from '../../atoms/Button';

type ScanStatus = 'complete' | 'processing' | 'error';
type BatchReviewState = 'default' | 'confirming';

interface BatchItem {
  id: number;
  merchant: string;
  amount: string;
  status: ScanStatus;
}

interface BatchReviewShellProps {
  state?: BatchReviewState;
  items?: readonly BatchItem[];
  confirmLabel?: string;
}

const MOCK_ITEMS: readonly BatchItem[] = [
  { id: 1, merchant: 'Jumbo Costanera Center', amount: '$24.890', status: 'complete' },
  { id: 2, merchant: 'Processing...', amount: '—', status: 'processing' },
  { id: 3, merchant: 'Read error', amount: '—', status: 'error' },
] as const;

export function BatchReviewShell({
  state = 'default',
  items = MOCK_ITEMS,
  confirmLabel = 'Confirm all',
}: BatchReviewShellProps) {
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
          marginBottom: '24px',
        }}
      >
        Batch review ({items.length})
      </h1>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {item.merchant}
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                }}
              >
                {item.amount}
              </p>
            </div>
            <ScanStatusIndicator status={item.status} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '24px' }}>
        <Button
          style={{ width: '100%' }}
          loading={state === 'confirming'}
          disabled={state === 'confirming'}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
