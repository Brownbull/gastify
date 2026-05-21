import { mobileConfig } from "./mobileConfig";
import {
  getFreshFirebaseIdToken,
  ScanUploadError,
} from "./scanUpload";
import type { ScanSubmissionResult } from "../stores/scanStore";

interface SubmitScanTestCaseOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  tokenProvider?: () => Promise<string | null>;
}

export async function submitScanTestCase(
  caseId: string,
  options: SubmitScanTestCaseOptions = {},
): Promise<ScanSubmissionResult> {
  if (!mobileConfig.scanTestControlsEnabled) {
    throw new ScanUploadError(
      "scan_test_controls_disabled",
      "Scan test controls are disabled",
    );
  }

  const token = await (options.tokenProvider ?? getFreshFirebaseIdToken)();
  if (!token) {
    throw new ScanUploadError("auth_error", "Sign in again before scanning");
  }

  const response = await (options.fetchImpl ?? fetch)(
    `${mobileConfig.apiBaseUrl}/api/v1/scan-test-cases/${caseId}/runs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new ScanUploadError(
      response.status === 403 ? "auth_error" : "upload_error",
      await readErrorDetail(response),
    );
  }

  return (await response.json()) as ScanSubmissionResult;
}

async function readErrorDetail(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  const detail = (body as { detail?: unknown } | null)?.detail;
  return typeof detail === "string" ? detail : `Scan test case failed (${response.status})`;
}
