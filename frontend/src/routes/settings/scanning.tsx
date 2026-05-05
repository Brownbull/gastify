import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/scanning')({
  component: SettingsScanningRoute,
});

function SettingsScanningRoute() {
  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        Scanning
      </h1>
    </div>
  );
}
