import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
});

function ScanPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
        Scan Receipt
      </h1>
      <p style={{ color: "var(--text-secondary)" }}>
        Upload a receipt image to extract transaction data.
      </p>
    </div>
  );
}
