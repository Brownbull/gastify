type BatchCaptureState = 'capturing' | 'limit-reached';

interface BatchCaptureShellProps {
  state?: BatchCaptureState;
  capturedCount?: number;
  maxCount?: number;
}

export function BatchCaptureShell({
  state = 'capturing',
  capturedCount = 3,
  maxCount = 10,
}: BatchCaptureShellProps) {
  const isLimitReached = state === 'limit-reached';
  const displayCount = isLimitReached ? maxCount : capturedCount;
  const thumbnails = Array.from({ length: Math.min(displayCount, 5) }, (_, i) => i + 1);

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
      {/* Capture counter */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '6px 14px',
          borderRadius: '20px',
          backgroundColor: isLimitReached
            ? 'rgba(239, 68, 68, 0.3)'
            : 'rgba(255,255,255,0.15)',
          color: isLimitReached ? '#fca5a5' : '#fff',
          fontSize: '0.875rem',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
        }}
      >
        {displayCount}/{maxCount}
      </div>

      {/* Camera viewfinder */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 280,
            height: 380,
            border: `2px solid ${isLimitReached ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.3)'}`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              color: isLimitReached ? 'rgba(252, 165, 165, 0.6)' : 'rgba(255,255,255,0.4)',
              fontSize: '0.875rem',
              textAlign: 'center',
              padding: '0 16px',
            }}
          >
            {isLimitReached ? 'Batch limit reached' : 'Camera view'}
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        style={{
          width: '100%',
          padding: '16px 24px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Thumbnail strip */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {thumbnails.map((n) => (
            <div
              key={n}
              style={{
                width: 48,
                height: 48,
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              aria-label={`Capture ${n}`}
            />
          ))}
          {displayCount > 5 && (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              +{displayCount - 5}
            </div>
          )}
        </div>

        {/* Capture button */}
        <button
          type="button"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: isLimitReached ? '#666' : '#fff',
            border: `4px solid ${isLimitReached ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)'}`,
            cursor: isLimitReached ? 'not-allowed' : 'pointer',
            opacity: isLimitReached ? 0.5 : 1,
          }}
          disabled={isLimitReached}
          aria-label="Capture"
        />
      </div>
    </div>
  );
}
