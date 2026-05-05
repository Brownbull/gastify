import { ScanStatusIndicator } from '../../molecules/ScanStatusIndicator';
import { DateTimeTag } from '../../molecules/DateTimeTag';

type ScanStatus = 'idle' | 'processing' | 'complete' | 'error';

interface ScanEntry {
  id: number;
  merchant: string;
  date: Date;
  status: ScanStatus;
}

const MOCK_SCANS: readonly ScanEntry[] = [
  { id: 1, merchant: 'Jumbo Costanera Center', date: new Date('2026-05-04T10:30:00'), status: 'complete' },
  { id: 2, merchant: 'Copec Av. Providencia', date: new Date('2026-05-04T09:15:00'), status: 'complete' },
  { id: 3, merchant: 'Farmacia Cruz Verde', date: new Date('2026-05-03T18:40:00'), status: 'processing' },
  { id: 4, merchant: 'Uber Eats', date: new Date('2026-05-03T14:20:00'), status: 'error' },
  { id: 5, merchant: 'Lider Express', date: new Date('2026-05-02T11:00:00'), status: 'complete' },
] as const;

export function RecentScansShell() {
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
        Escaneos recientes
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {MOCK_SCANS.map((scan) => (
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
    </div>
  );
}
