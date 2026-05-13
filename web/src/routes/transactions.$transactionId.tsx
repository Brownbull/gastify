import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/transactions/$transactionId")({
  component: TransactionDetailPage,
});

function TransactionDetailPage() {
  const { transactionId } = Route.useParams();

  return (
    <div className="space-y-6">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--text)" }}
      >
        Transaction Detail
      </h1>
      <p style={{ color: "var(--text-secondary)" }}>
        Transaction ID: {transactionId}
      </p>
    </div>
  );
}
