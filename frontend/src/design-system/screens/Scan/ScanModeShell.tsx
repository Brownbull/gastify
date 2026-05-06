import { Camera, Images, FileText } from 'lucide-react';

type LayoutMode = 'mobile' | 'desktop';

interface ScanModeShellProps {
  layout?: LayoutMode;
  disabled?: boolean;
  title?: string;
  disabledMessage?: string;
}

const MODES = [
  {
    icon: Camera,
    title: 'Single scan',
    description: 'Capture a receipt with your device camera',
  },
  {
    icon: Images,
    title: 'Batch capture',
    description: 'Scan multiple receipts in quick sequence',
  },
  {
    icon: FileText,
    title: 'Upload statement',
    description: 'Import transactions from your bank statement',
  },
] as const;

export function ScanModeShell({
  layout = 'mobile',
  disabled = false,
  title = 'Scan',
  disabledMessage,
}: ScanModeShellProps) {
  const isDesktop = layout === 'desktop';

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

      {disabled && disabledMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'var(--warning-bg, rgba(245, 158, 11, 0.1))',
            border: '1px solid var(--warning, #f59e0b)',
            marginBottom: '16px',
          }}
          role="status"
        >
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              fontWeight: 500,
            }}
          >
            {disabledMessage}
          </p>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          gap: '16px',
        }}
      >
        {MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <div
              key={mode.title}
              style={{
                flex: isDesktop ? 1 : undefined,
                padding: '20px',
                borderRadius: '16px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: isDesktop ? 'center' : 'flex-start',
                gap: '12px',
                textAlign: isDesktop ? 'center' : 'left',
                pointerEvents: disabled ? 'none' : undefined,
              }}
              aria-disabled={disabled || undefined}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  backgroundColor: disabled ? 'var(--text-tertiary)' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={24} color="#fff" aria-hidden="true" />
              </div>
              <div>
                <p
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                  }}
                >
                  {mode.title}
                </p>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  {mode.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
