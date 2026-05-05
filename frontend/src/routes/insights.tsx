import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/insights')({
  component: InsightsRoute,
});

function InsightsRoute() {
  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        Insights
      </h1>
    </div>
  );
}
