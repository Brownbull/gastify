import { useCallback, useRef, useState, type DragEvent } from "react";

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
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors"
        style={{
          borderColor: dragActive
            ? "var(--primary)"
            : validationError
              ? "var(--error, #ef4444)"
              : "var(--border)",
          backgroundColor: dragActive
            ? "var(--primary-light)"
            : "var(--surface)",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span className="mb-3 text-4xl">📷</span>
        <p
          className="mb-1 text-sm font-medium"
          style={{ color: "var(--text)" }}
        >
          {dragActive
            ? "Drop your receipt here"
            : "Drag & drop a receipt image"}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          or click to browse — JPEG, PNG, WebP, HEIC (max 20 MB)
        </p>
      </div>

      {validationError && (
        <p
          className="text-sm"
          role="alert"
          style={{ color: "var(--error, #ef4444)" }}
        >
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
