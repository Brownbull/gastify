import { describe, expect, it, vi } from "vitest";
import {
  submitScan,
  getScanStatus,
  triggerProcess,
  discardTransactions,
  BatchScanError,
} from "./batchScan";

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

const TOKEN = async (): Promise<string> => "token-123";
const FILE = new File(["receipt"], "a.jpg", { type: "image/jpeg" });

function okJson(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

function errStatus(status: number, body: unknown = null): Response {
  return { ok: false, status, json: async () => body } as unknown as Response;
}

describe("batchScan lib", () => {
  it("submitScan posts multipart with bearer token and returns the submission", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({ id: "scan-1", status: "submitted" }),
    );
    const result = await submitScan(FILE, {
      fetchImpl,
      tokenProvider: TOKEN,
      apiBase: "http://api",
    });

    expect(result.id).toBe("scan-1");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://api/api/v1/scans");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer token-123");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("submitScan throws an auth error when no token is available", async () => {
    await expect(
      submitScan(FILE, { tokenProvider: async () => null }),
    ).rejects.toBeInstanceOf(BatchScanError);
  });

  it("submitScan surfaces the server detail on failure", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(errStatus(413, { detail: "File too large" }));
    await expect(
      submitScan(FILE, { fetchImpl, tokenProvider: TOKEN }),
    ).rejects.toThrow("File too large");
  });

  it("getScanStatus returns the authoritative status row", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({
        id: "scan-1",
        status: "completed",
        error_code: null,
        error_message: null,
        transaction_id: "txn-9",
      }),
    );
    const status = await getScanStatus("scan-1", {
      fetchImpl,
      tokenProvider: TOKEN,
      apiBase: "http://api",
    });

    expect(status.status).toBe("completed");
    expect(status.transaction_id).toBe("txn-9");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api/api/v1/scans/scan-1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("triggerProcess posts to the reprocess endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJson({}));
    await triggerProcess("scan-1", {
      fetchImpl,
      tokenProvider: TOKEN,
      apiBase: "http://api",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api/api/v1/scans/scan-1/process",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("discardTransactions batch-deletes and is a no-op for an empty list", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJson({}));
    await discardTransactions([], { fetchImpl, tokenProvider: TOKEN });
    expect(fetchImpl).not.toHaveBeenCalled();

    await discardTransactions(["txn-1", "txn-2"], {
      fetchImpl,
      tokenProvider: TOKEN,
      apiBase: "http://api",
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://api/api/v1/transactions/batch-delete");
    expect(JSON.parse(init.body)).toEqual({
      transaction_ids: ["txn-1", "txn-2"],
    });
  });
});
