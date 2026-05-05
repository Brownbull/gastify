import { Camera, Images, FileText } from 'lucide-react';

type LayoutMode = 'mobile' | 'desktop';

interface ScanModeShellProps {
  layout?: LayoutMode;
}

const MODES = [
  {
    icon: Camera,
    title: 'Escaneo individual',
    description: 'Capture a receipt with your device camera',
  },
  {
    icon: Images,
    title: 'Captura por lote',
    description: 'Scan multiple receipts in quick sequence',
  },
  {
    icon: FileText,
    title: 'Subir estado de cuenta',
    description: 'Importa transacciones desde tu cartola bancaria',
  },
] as const;

export function ScanModeShell({ layout = 'mobile' }: ScanModeShellProps) {
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
        Escanear
      </h1>

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
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isDesktop ? 'center' : 'flex-start',
                gap: '12px',
                textAlign: isDesktop ? 'center' : 'left',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary)',
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
