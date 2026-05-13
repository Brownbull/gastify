import { useScanStore } from "@/stores/scanStore";

interface ErrorConfig {
  title: string;
  description: string;
  action: string;
}

const ERROR_MAP: Record<string, ErrorConfig> = {
  upload_error: {
    title: "Upload Failed",
    description: "The image could not be uploaded. Check your connection and try again.",
    action: "Try again",
  },
  auth_error: {
    title: "Authentication Error",
    description: "Your session may have expired. Please sign in again.",
    action: "Sign in",
  },
  connection_lost: {
    title: "Connection Lost",
    description: "Lost connection to scan progress after multiple retries.",
    action: "Retry scan",
  },
  invalid_image: {
    title: "Invalid Image",
    description: "The file could not be processed as a receipt image. Please use a clear photo.",
    action: "Try a different image",
  },
  safety_block: {
    title: "Content Blocked",
    description: "The image was flagged by our safety filter. Please use a valid receipt photo.",
    action: "Try a different image",
  },
  extraction_parse_error: {
    title: "Extraction Failed",
    description: "Could not read the receipt. The image may be blurry or not a valid receipt.",
    action: "Try a different image",
  },
  rate_limit: {
    title: "Too Many Requests",
    description: "You've made too many scan requests. Please wait a moment before trying again.",
    action: "Wait and retry",
  },
  categorization_timeout: {
    title: "Categorization Timed Out",
    description: "Item categorization took too long. Please try scanning again.",
    action: "Retry scan",
  },
  categorization_parse_error: {
    title: "Categorization Failed",
    description: "Items were extracted but could not be categorized. You can still review the results.",
    action: "Review results",
  },
  reconciliation_mismatch: {
    title: "Math Check Failed",
    description:
      "The line item totals don't match the receipt total. The scan may still be usable — please review.",
    action: "Review results",
  },
  unknown_error: {
    title: "Scan Error",
    description: "An unexpected error occurred while processing your receipt.",
    action: "Try again",
  },
};

const FALLBACK_ERROR: ErrorConfig = {
  title: "Scan Error",
  description: "An unexpected error occurred while processing your receipt.",
  action: "Try again",
};

interface ScanErrorProps {
  onRetry: () => void;
}

export function ScanError({ onRetry }: ScanErrorProps) {
  const phase = useScanStore((s) => s.phase);
  const errorCode = useScanStore((s) => s.errorCode);
  const errorMessage = useScanStore((s) => s.errorMessage);
  const reset = useScanStore((s) => s.reset);

  if (phase !== "failed") return null;

  const config = ERROR_MAP[errorCode?.toLowerCase() ?? ""] ?? FALLBACK_ERROR;

  return (
    <div
      className="rounded-xl border p-6"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--error, #ef4444)",
      }}
      role="alert"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3
            className="text-base font-semibold"
            style={{ color: "var(--text)" }}
          >
            {config.title}
          </h3>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {config.description}
          </p>
          {errorMessage && errorMessage !== config.description && (
            <p
              className="mt-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Detail: {errorMessage}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {config.action}
        </button>
        <button
          onClick={reset}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            color: "var(--text-secondary)",
            backgroundColor: "var(--border)",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
