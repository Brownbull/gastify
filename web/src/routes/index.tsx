import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
        Dashboard
      </h1>
      <p style={{ color: "var(--text-secondary)" }}>
        Welcome to Gastify. Scan a receipt or view your transactions.
      </p>
    </div>
  );
}
