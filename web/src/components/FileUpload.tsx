import { useCallback, useRef, useState, type DragEvent } from "react";
import { IconTile } from "@/components/ui/IconTile";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.heic,.heif";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)) {
      return `Unsupported file type. Accepted: JPEG, PNG, WebP, HEIC`;
    }
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)} MB`;
  }
  if (file.size === 0) {
    return "File is empty";
  }
  return null;
}

export function FileUpload({ onFileSelected, disabled = false }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        return;
      }
      setValidationError(null);
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrag = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile],
  );

  return (
    <div className="space-y-2">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="Upload receipt image"
        aria-disabled={disabled}
        className={`flex flex-col items-center justify-center gap-gt-8 rounded-gt-2xl border-2 border-dashed p-gt-32 text-center transition duration-150 ease-gt-bounce ${
          dragActive
            ? "border-gt-primary bg-gt-primary-soft"
            : validationError
              ? "border-gt-error bg-gt-surface"
              : "border-gt-line-strong bg-gt-surface hover:-translate-y-0.5 hover:border-gt-primary"
        } ${disabled ? "opacity-50" : ""}`}
        style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      >
        <IconTile size="hero">
          <span className="text-4xl leading-none">📷</span>
        </IconTile>
        <p className="font-gt-display text-gt-md font-extrabold text-gt-ink">
          {dragActive ? "Drop your receipt here" : "Drag & drop a receipt image"}
        </p>
        <p className="text-gt-xs font-medium text-gt-ink-3">
          or click to browse — JPEG, PNG, WebP, HEIC (max 20 MB)
        </p>
      </div>

      {validationError && (
        <p className="text-gt-sm font-bold text-gt-error" role="alert">
          {validationError}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
