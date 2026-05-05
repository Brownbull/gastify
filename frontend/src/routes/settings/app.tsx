import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/app')({
  component: SettingsAppRoute,
});

function SettingsAppRoute() {
  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        App Settings
      </h1>
    </div>
  );
}
