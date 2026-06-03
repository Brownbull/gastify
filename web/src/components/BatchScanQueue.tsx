import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useI18n } from "@/hooks/useI18n";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ALLOWED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.heic,.heif";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export interface QueuedFile {
  localId: string;
  file: File;
  fileName: string;
  previewUrl: string | null;
}

interface BatchScanQueueProps {
  queued: readonly QueuedFile[];
  maxFiles: number;
  onAddFiles: (files: File[]) => void;
  onRemove: (localId: string) => void;
  onScan: () => void;
}

function isValidFile(file: File): boolean {
  if (file.size === 0 || file.size > MAX_FILE_SIZE) return false;
  if (ALLOWED_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext);
}

export function BatchScanQueue({
  queued,
  maxFiles,
  onAddFiles,
  onRemove,
  onScan,
}: BatchScanQueueProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState(false);

  const atCapacity = queued.length >= maxFiles;

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      const valid = selected.filter(isValidFile);
      setRejected(valid.length < selected.length);
      if (valid.length > 0) {
        onAddFiles(valid.slice(0, maxFiles - queued.length));
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [maxFiles, onAddFiles, queued.length],
  );

  return (
    <div className="space-y-4" data-testid="batch-queue">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={atCapacity}
        data-testid="batch-add-images"
        className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
      >
        <span className="mb-3 text-4xl">🧾</span>
        <p className="mb-1 text-sm font-medium" style={{ color: "var(--text)" }}>
          {t("batch.addImages")}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("batch.addHint")}
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS}
        onChange={handleInputChange}
        data-testid="batch-file-input"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {rejected && (
        <p
          className="text-sm"
          role="alert"
          style={{ color: "var(--error, #ef4444)" }}
        >
          {t("batch.someRejected")}
        </p>
      )}

      {queued.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              {queued.length} / {maxFiles} {t("batch.receipts")}
            </p>
            {atCapacity && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {t("batch.maxReached")}
              </span>
            )}
          </div>

          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {queued.map((item) => (
              <li
                key={item.localId}
                data-testid="batch-queue-item"
                className="relative overflow-hidden rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              >
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.fileName}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-24 w-full items-center justify-center text-2xl"
                    style={{ backgroundColor: "var(--background, #f9fafb)" }}
                  >
                    🧾
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(item.localId)}
                  aria-label={t("batch.remove")}
                  data-testid="batch-queue-remove"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs text-white"
                  style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onScan}
            data-testid="batch-scan-submit"
            className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {t("batch.scanReceipts")} ({queued.length})
          </button>
        </>
      )}
    </div>
  );
}
