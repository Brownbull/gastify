import { Upload, CheckCircle } from 'lucide-react';
import { ScanProgress } from '../../molecules/ScanProgress';
import { ErrorFallback } from '../../molecules/ErrorFallback';

type LayoutMode = 'mobile' | 'desktop';
type ScanSingleState = 'idle' | 'capturing' | 'processing' | 'success' | 'error';

interface ScanSingleShellProps {
  layout?: LayoutMode;
  state?: ScanSingleState;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function ScanSingleShell({
  layout = 'mobile',
  state = 'idle',
  onRetry = () => {},
  onGoHome = () => {},
}: ScanSingleShellProps) {
  if (layout === 'desktop') {
    return <DesktopView />;
  }
  return <MobileView state={state} onRetry={onRetry} onGoHome={onGoHome} />;
}

function MobileView({
  state,
  onRetry,
  onGoHome,
}: {
  state: ScanSingleState;
  onRetry: () => void;
  onGoHome: () => void;
}) {
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

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {state === 'processing' && <ProcessingOverlay />}
        {state === 'success' && <SuccessOverlay />}
        {state === 'error' && (
          <div style={{ padding: '24px' }}>
            <ErrorFallback
              error="Could not read the receipt. Make sure it is well-lit and in focus."
              onRetry={onRetry}
              onGoHome={onGoHome}
            />
          </div>
        )}
        {(state === 'idle' || state === 'capturing') && (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 280,
                height: 380,
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
                Camera view
              </p>
            </div>
            {/* Flash overlay for capturing state */}
            {state === 'capturing' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '16px',
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  pointerEvents: 'none',
                }}
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>

      {/* Capture button */}
      {(state === 'idle' || state === 'capturing') && (
        <div style={{ paddingBottom: 40 }}>
          <button
            type="button"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: '#fff',
              border: '4px solid rgba(255,255,255,0.3)',
              cursor: state === 'capturing' ? 'not-allowed' : 'pointer',
              opacity: state === 'capturing' ? 0.5 : 1,
            }}
            disabled={state === 'capturing'}
            aria-label="Capture"
          />
        </div>
      )}
    </div>
  );
}

function ProcessingOverlay() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        padding: '32px',
        width: '100%',
        maxWidth: 320,
      }}
    >
      <ScanProgress
        uploadProgress={100}
        extractionProgress={45}
        stage="extracting"
        uploadLabel="Upload"
        extractionLabel="Extraction"
        stageLabel="Reading receipt data..."
      />
    </div>
  );
}

function SuccessOverlay() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <CheckCircle size={64} style={{ color: 'var(--positive, #22c55e)' }} aria-hidden="true" />
      <p
        style={{
          color: '#fff',
          fontSize: '1.25rem',
          fontWeight: 600,
        }}
      >
        Scan complete
      </p>
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
          or click to select a file
        </p>
      </div>
    </div>
  );
}
