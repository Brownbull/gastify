import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
        Transactions
      </h1>
      <p style={{ color: "var(--text-secondary)" }}>
        View and manage your expense history.
      </p>
    </div>
  );
}
