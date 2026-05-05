export function BatchCaptureShell() {
  const thumbnails = [1, 2, 3];

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
          backgroundColor: 'rgba(255,255,255,0.15)',
          color: '#fff',
          fontSize: '0.875rem',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
        }}
      >
        3/10
      </div>

      {/* Camera viewfinder */}
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
              aria-label={`Captura ${n}`}
            />
          ))}
        </div>

        {/* Capture button */}
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
