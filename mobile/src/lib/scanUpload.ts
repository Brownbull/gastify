import auth from "@react-native-firebase/auth";
import { mobileConfig } from "./mobileConfig";
import type {
  ReceiptScanAsset,
  ScanSubmissionResult,
} from "../stores/scanStore";

export const MAX_RECEIPT_IMAGE_BYTES = 20 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export class ScanUploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ScanUploadError";
  }
}

interface SubmitReceiptScanOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  tokenProvider?: () => Promise<string | null>;
}

interface ValidatedUploadFile {
  uri: string;
  name: string;
  type: string;
}

export function validateReceiptScanAsset(
  asset: ReceiptScanAsset,
): ValidatedUploadFile {
  if (!asset.uri) {
    throw new ScanUploadError("invalid_file", "Selected image has no file URI");
  }

  const type = normalizeContentType(asset.mimeType, asset.fileName, asset.uri);
  if (!ALLOWED_CONTENT_TYPES.has(type)) {
    throw new ScanUploadError(
      "invalid_file_type",
      "Use a JPG, PNG, WebP, HEIC, or HEIF receipt image",
    );
  }

  if (asset.fileSize != null && asset.fileSize > MAX_RECEIPT_IMAGE_BYTES) {
    throw new ScanUploadError(
      "file_too_large",
      "Receipt images must be 20 MB or smaller",
    );
  }

  return {
    uri: asset.uri,
    name: asset.fileName || `receipt.${extensionForType(type)}`,
    type,
  };
}

export async function submitReceiptScan(
  asset: ReceiptScanAsset,
  options: SubmitReceiptScanOptions = {},
): Promise<ScanSubmissionResult> {
  const file = validateReceiptScanAsset(asset);
  const token = await (options.tokenProvider ?? getFreshFirebaseIdToken)();

  if (!token) {
    throw new ScanUploadError("auth_error", "Sign in again before scanning");
  }

  const formData = new FormData();
  formData.append("file", file as unknown as Blob);

  const response = await (options.fetchImpl ?? fetch)(
    `${mobileConfig.apiBaseUrl}/api/v1/scans`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new ScanUploadError(
      statusToErrorCode(response.status),
      await readErrorDetail(response),
    );
  }

  return (await response.json()) as ScanSubmissionResult;
}

export async function getFreshFirebaseIdToken(): Promise<string | null> {
  const user = auth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

function normalizeContentType(
  mimeType: string | undefined,
  fileName: string,
  uri: string,
): string {
  const normalized = mimeType?.toLowerCase();
  if (normalized === "image/jpg") return "image/jpeg";
  if (normalized && normalized !== "image") return normalized;

  const extension = (fileName || uri).split("?")[0].split(".").pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      return "application/octet-stream";
  }
}

function extensionForType(type: string): string {
  switch (type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "jpg";
  }
}

function statusToErrorCode(status: number): string {
  if (status === 401 || status === 403) return "auth_error";
  if (status === 413) return "file_too_large";
  if (status === 422) return "invalid_image";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server_error";
  return "upload_error";
}

async function readErrorDetail(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return "The selected image did not pass upload validation";
  }
  return `Upload failed (${response.status})`;
}
