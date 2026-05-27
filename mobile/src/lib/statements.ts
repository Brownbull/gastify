import { apiClient } from "./api";
import { mobileConfig } from "./mobileConfig";
import { getFreshFirebaseIdToken } from "./scanUpload";
import type { components } from "./api-types";
import type { StatementPdfAsset, StatementUploadResponse } from "../stores/statementStore";

export const MAX_STATEMENT_PDF_BYTES = 25 * 1024 * 1024;

export type CardAlias = components["schemas"]["CardAliasResponse"];
export type CardAliasCreate = components["schemas"]["CardAliasCreate"];
export type CardAliasUpdate = components["schemas"]["CardAliasUpdate"];
export type StatementRecord = components["schemas"]["StatementRecordResponse"];
export type StatementProcessRequest = components["schemas"]["StatementProcessRequest"];
export type StatementReconciliationResponse =
  components["schemas"]["StatementReconciliationResponse"];
export type StatementReconciliationBucketItem =
  components["schemas"]["StatementReconciliationBucketItem"];
export type StatementTransactionCandidate =
  components["schemas"]["StatementTransactionCandidate"];
export type TransactionCreate = components["schemas"]["TransactionCreate"];

export class StatementUploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "StatementUploadError";
  }
}

interface SubmitStatementOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  tokenProvider?: () => Promise<string | null>;
}

interface SubmitStatementInput {
  asset: StatementPdfAsset;
  cardAliasId?: string | null;
  password?: string | null;
  aiProcessingConsent: boolean;
}

interface ValidatedStatementFile {
  uri: string;
  name: string;
  type: string;
}

export function validateStatementPdfAsset(
  asset: StatementPdfAsset,
): ValidatedStatementFile {
  if (!asset.uri) {
    throw new StatementUploadError("invalid_file", "Selected PDF has no file URI");
  }

  const type = normalizeStatementContentType(asset.mimeType, asset.fileName, asset.uri);
  if (type !== "application/pdf") {
    throw new StatementUploadError("invalid_file_type", "Choose a PDF statement");
  }

  if (asset.fileSize != null && asset.fileSize > MAX_STATEMENT_PDF_BYTES) {
    throw new StatementUploadError(
      "file_too_large",
      "Statement PDFs must be 25 MB or smaller",
    );
  }

  return {
    uri: asset.uri,
    name: asset.fileName || "statement.pdf",
    type,
  };
}

export async function submitStatementPdf(
  input: SubmitStatementInput,
  options: SubmitStatementOptions = {},
): Promise<StatementUploadResponse> {
  if (!input.aiProcessingConsent) {
    throw new StatementUploadError(
      "ai_consent_required",
      "AI processing consent is required for every statement scan",
    );
  }

  const file = validateStatementPdfAsset(input.asset);
  const token = await (options.tokenProvider ?? getFreshFirebaseIdToken)();

  if (!token) {
    throw new StatementUploadError("auth_error", "Sign in again before scanning");
  }

  const formData = new FormData();
  formData.append("file", file as unknown as Blob);
  formData.append("ai_processing_consent", "true");
  if (input.cardAliasId) formData.append("card_alias_id", input.cardAliasId);
  if (input.password) formData.append("password", input.password);

  const response = await (options.fetchImpl ?? fetch)(
    `${mobileConfig.apiBaseUrl}/api/v1/statements`,
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
    throw new StatementUploadError(
      statusToStatementErrorCode(response.status),
      await readApiError(response, `Statement upload failed (${response.status})`),
    );
  }

  return (await response.json()) as StatementUploadResponse;
}

export async function listCardAliases(): Promise<CardAlias[]> {
  const { data, error } = await apiClient.GET("/api/v1/card-aliases");
  if (error || !data) {
    throw new Error("Failed to fetch card aliases");
  }
  return data;
}

export async function createCardAlias(body: CardAliasCreate): Promise<CardAlias> {
  const { data, error } = await apiClient.POST("/api/v1/card-aliases", { body });
  if (error || !data) {
    throw new Error("Failed to create card alias");
  }
  return data;
}

export async function listStatements(): Promise<StatementRecord[]> {
  const { data, error } = await apiClient.GET("/api/v1/statements");
  if (error || !data) {
    throw new Error("Failed to fetch statements");
  }
  return data;
}

export async function processStatement(
  statementId: string,
  body: StatementProcessRequest,
): Promise<StatementRecord> {
  const { data, error } = await apiClient.POST(
    "/api/v1/statements/{statement_id}/process",
    { params: { path: { statement_id: statementId } }, body },
  );
  if (error || !data) {
    throw new Error("Failed to process statement");
  }
  return data;
}

export async function reconcileStatement(
  statementId: string,
): Promise<StatementReconciliationResponse> {
  const { data, error } = await apiClient.POST(
    "/api/v1/statements/{statement_id}/reconcile",
    { params: { path: { statement_id: statementId } } },
  );
  if (error || !data) {
    throw new Error("Failed to reconcile statement");
  }
  return data;
}

export async function getStatementReconciliation(
  statementId: string,
): Promise<StatementReconciliationResponse> {
  const { data, error } = await apiClient.GET(
    "/api/v1/statements/{statement_id}/reconciliation",
    { params: { path: { statement_id: statementId } } },
  );
  if (error || !data) {
    throw new Error("Failed to fetch statement reconciliation");
  }
  return data;
}

export async function createStatementTransaction(
  body: TransactionCreate,
): Promise<Record<string, string>> {
  const { data, error } = await apiClient.POST("/api/v1/transactions", { body });
  if (error || !data) {
    throw new Error("Failed to create transaction");
  }
  return data;
}

function normalizeStatementContentType(
  mimeType: string | undefined,
  fileName: string,
  uri: string,
): string {
  const normalized = mimeType?.toLowerCase();
  if (normalized === "application/x-pdf") return "application/pdf";
  if (normalized && normalized !== "application/octet-stream") return normalized;

  const extension = (fileName || uri).split("?")[0].split(".").pop()?.toLowerCase();
  return extension === "pdf" ? "application/pdf" : "application/octet-stream";
}

function statusToStatementErrorCode(status: number): string {
  if (status === 401 || status === 403) return "auth_error";
  if (status === 413) return "file_too_large";
  if (status === 422) return "invalid_pdf";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server_error";
  return "upload_error";
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  const detail = (body as { detail?: unknown } | null)?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (typeof first?.msg === "string") return first.msg;
    return "The selected PDF did not pass upload validation";
  }
  return fallback;
}
