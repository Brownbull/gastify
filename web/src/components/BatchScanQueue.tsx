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
    <div className="space-y-gt-12" data-testid="batch-queue">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={atCapacity}
        data-testid="batch-add-images"
        className="flex w-full flex-col items-center justify-center gap-gt-6 rounded-gt-2xl border-2 border-dashed border-gt-line-strong bg-gt-surface p-gt-24 text-center transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:border-gt-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-4xl leading-none">🧾</span>
        <p className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t("batch.addImages")}</p>
        <p className="text-gt-xs font-medium text-gt-ink-3">{t("batch.addHint")}</p>
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
        <p className="text-gt-sm font-bold text-gt-error" role="alert">
          {t("batch.someRejected")}
        </p>
      )}

      {queued.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-gt-sm font-extrabold text-gt-ink">
              {queued.length} / {maxFiles} {t("batch.receipts")}
            </p>
            {atCapacity && (
              <span className="text-gt-xs font-bold text-gt-ink-3">{t("batch.maxReached")}</span>
            )}
          </div>

          <ul className="grid grid-cols-3 gap-gt-8 sm:grid-cols-4">
            {queued.map((item) => (
              <li
                key={item.localId}
                data-testid="batch-queue-item"
                className="relative overflow-hidden rounded-gt-lg border-2 border-gt-line-strong shadow-gt-xs"
              >
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt={item.fileName} className="h-24 w-full object-cover" />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center bg-gt-bg-3 text-2xl">🧾</div>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(item.localId)}
                  aria-label={t("batch.remove")}
                  data-testid="batch-queue-remove"
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface text-gt-xs font-extrabold text-gt-ink"
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
            className="w-full rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary px-gt-16 py-gt-12 font-gt-display text-gt-sm font-extrabold text-white shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5"
          >
            {t("batch.scanReceipts")} ({queued.length})
          </button>
        </>
      )}
    </div>
  );
}
