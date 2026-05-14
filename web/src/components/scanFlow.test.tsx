import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FileUpload } from "./FileUpload";
import { ScanError } from "./ScanError";
import { ScanResult } from "./ScanResult";
import { useScanStore, type ScanSubmissionResult } from "@/stores/scanStore";

const submission: ScanSubmissionResult = {
  id: "scan-1",
  ownership_scope_id: "scope-1",
  status: "submitted",
  original_filename: "receipt.jpg",
  content_type: "image/jpeg",
  file_size_bytes: 1024,
  image_path: "receipts/scan-1.jpg",
  thumbnail_path: null,
  submitted_at: "2026-05-13T12:00:00Z",
};

describe("scan flow components", () => {
  beforeEach(() => {
    useScanStore.getState().reset();
  });

  it("shows error-code-specific scan failure UX", () => {
    useScanStore.getState().uploadComplete(submission);
    useScanStore.getState().receiveEvent({
      event_type: "scan_failed",
      scan_id: "scan-1",
      step: "failed",
      progress_pct: 0,
      error: {
        code: "categorization_timeout",
        message: "Categorizer did not finish in 30 seconds",
      },
    });

    render(<ScanError onRetry={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Categorization Timed Out",
    );
    expect(screen.getByText("Retry scan")).toBeInTheDocument();
    expect(
      screen.getByText("Detail: Categorizer did not finish in 30 seconds"),
    ).toBeInTheDocument();
  });

  it("surfaces unknown merchant and low-confidence scan result states", () => {
    useScanStore.getState().uploadComplete(submission);
    useScanStore.getState().receiveEvent({
      event_type: "scan_complete",
      scan_id: "scan-1",
      step: "done",
      progress_pct: 100,
      data: {
        merchant_name: "Almacen Don Hugo",
        transaction_date: "2026-05-13",
        currency_code: "CLP",
        total_amount: 12500,
        confidence_score: 0.42,
        is_new_merchant: true,
        line_items: [{ name: "Pan amasado", qty: 2, total_price: 2500 }],
      },
    });

    render(<ScanResult />);

    expect(screen.getByText("42% confidence")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Low confidence scan",
    );
    expect(screen.getByText("First scan at this merchant")).toBeInTheDocument();
    expect(screen.getByText("Almacen Don Hugo")).toBeInTheDocument();
  });

  it("rejects invalid files before invoking upload", async () => {
    const onFileSelected = vi.fn();

    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("file input not found");
    }

    fireEvent.change(input, {
      target: {
        files: [
          new File(["not a receipt"], "notes.txt", { type: "text/plain" }),
        ],
      },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unsupported file type",
    );
    expect(onFileSelected).not.toHaveBeenCalled();
  });
});
