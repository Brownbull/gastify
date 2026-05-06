import { FileSearch } from 'lucide-react';
import { ScanStatusIndicator } from '../../molecules/ScanStatusIndicator';
import { DateTimeTag } from '../../molecules/DateTimeTag';
import { Skeleton } from '../../atoms/Skeleton';

type ScanStatus = 'idle' | 'processing' | 'complete' | 'error';
type RecentScansState = 'default' | 'empty' | 'loading';

interface ScanEntry {
  id: number;
  merchant: string;
  date: Date;
  status: ScanStatus;
}

interface RecentScansShellProps {
  state?: RecentScansState;
  scans?: readonly ScanEntry[];
  title?: string;
  emptyMessage?: string;
}

const MOCK_SCANS: readonly ScanEntry[] = [
  { id: 1, merchant: 'Jumbo Costanera Center', date: new Date('2026-05-04T10:30:00'), status: 'complete' },
  { id: 2, merchant: 'Copec Av. Providencia', date: new Date('2026-05-04T09:15:00'), status: 'complete' },
  { id: 3, merchant: 'Farmacia Cruz Verde', date: new Date('2026-05-03T18:40:00'), status: 'processing' },
  { id: 4, merchant: 'Uber Eats', date: new Date('2026-05-03T14:20:00'), status: 'error' },
  { id: 5, merchant: 'Lider Express', date: new Date('2026-05-02T11:00:00'), status: 'complete' },
] as const;

const SKELETON_COUNT = 5;

export function RecentScansShell({
  state = 'default',
  scans = MOCK_SCANS,
  title = 'Recent scans',
  emptyMessage = 'No recent scans',
}: RecentScansShellProps) {
  return (
    <div
      style={{
        padding: '24px 16px',
        backgroundColor: 'var(--background)',
        minHeight: '100vh',
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
        {title}
      </h1>

      {state === 'loading' && <LoadingSkeleton />}
      {state === 'empty' && <EmptyState message={emptyMessage} />}
      {state === 'default' && <ScanList scans={scans} />}
    </div>
  );
}

function ScanList({ scans }: { scans: readonly ScanEntry[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {scans.map((scan) => (
        <div
          key={scan.id}
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
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
              {scan.merchant}
            </p>
            <DateTimeTag date={scan.date} mode="relative" />
          </div>
          <ScanStatusIndicator status={scan.status} />
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <Skeleton key={i} shape="list-item" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '64px 32px',
      }}
    >
      <FileSearch size={48} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
      <p
        style={{
          fontSize: '1rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}
      >
        {message}
      </p>
    </div>
  );
}
