import { Upload } from 'lucide-react';

type LayoutMode = 'mobile' | 'desktop';

interface ScanSingleShellProps {
  layout?: LayoutMode;
}

export function ScanSingleShell({ layout = 'mobile' }: ScanSingleShellProps) {
  if (layout === 'desktop') {
    return <DesktopView />;
  }
  return <MobileView />;
}

function MobileView() {
  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: '#111',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Credit badge */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '6px 12px',
          borderRadius: '20px',
          backgroundColor: 'rgba(255,255,255,0.15)',
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
        }}
      >
        12 credits
      </div>

      {/* Viewfinder area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 280,
            height: 380,
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            Camera view
          </p>
        </div>
      </div>

      {/* Capture button */}
      <div style={{ paddingBottom: 40 }}>
        <button
          type="button"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: '#fff',
            border: '4px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
          }}
          aria-label="Capturar"
        />
      </div>
    </div>
  );
}

function DesktopView() {
  return (
    <div
      style={{
        padding: '48px',
        backgroundColor: 'var(--background)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}
    >
      <div
        style={{
          alignSelf: 'flex-end',
          padding: '6px 12px',
          borderRadius: '20px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}
      >
        12 credits available
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 480,
          padding: '64px 32px',
          border: '2px dashed var(--border)',
          borderRadius: '16px',
          backgroundColor: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          cursor: 'pointer',
        }}
      >
        <Upload size={48} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
        <p
          style={{
            fontSize: '1rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          Drop your receipt here
        </p>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-tertiary)',
          }}
        >
          o haz clic para seleccionar archivo
        </p>
      </div>
    </div>
  );
}
