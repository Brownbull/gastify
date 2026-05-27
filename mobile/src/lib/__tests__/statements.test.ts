import {
  StatementUploadError,
  submitStatementPdf,
  validateStatementPdfAsset,
} from "../statements";

jest.mock("../api", () => ({
  apiClient: {},
}));

jest.mock("../scanUpload", () => ({
  getFreshFirebaseIdToken: jest.fn(),
}));

describe("statement upload helpers", () => {
  it("validates PDF assets and normalizes PDF content type", () => {
    expect(
      validateStatementPdfAsset({
        uri: "file:///tmp/statement.pdf",
        fileName: "statement.pdf",
        mimeType: "application/octet-stream",
        fileSize: 1024,
      }),
    ).toEqual({
      uri: "file:///tmp/statement.pdf",
      name: "statement.pdf",
      type: "application/pdf",
    });
  });

  it("rejects non-PDF assets before upload", () => {
    expect(() =>
      validateStatementPdfAsset({
        uri: "file:///tmp/statement.jpg",
        fileName: "statement.jpg",
        mimeType: "image/jpeg",
      }),
    ).toThrow(StatementUploadError);
  });

  it("requires per-scan AI consent before submitting", async () => {
    await expect(
      submitStatementPdf(
        {
          asset: {
            uri: "file:///tmp/statement.pdf",
            fileName: "statement.pdf",
            mimeType: "application/pdf",
          },
          aiProcessingConsent: false,
        },
        {
          fetchImpl: jest.fn(),
          tokenProvider: jest.fn().mockResolvedValue("token"),
        },
      ),
    ).rejects.toMatchObject({ code: "ai_consent_required" });
  });

  it("submits statement PDFs as authenticated multipart uploads", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        statement: { id: "statement-1", status: "queued" },
        duplicate: false,
        queued: true,
        password_required: false,
      }),
    });

    const response = await submitStatementPdf(
      {
        asset: {
          uri: "file:///tmp/statement.pdf",
          fileName: "statement.pdf",
          mimeType: "application/pdf",
        },
        cardAliasId: "alias-1",
        password: "secret",
        aiProcessingConsent: true,
      },
      {
        fetchImpl,
        tokenProvider: jest.fn().mockResolvedValue("token"),
      },
    );

    expect(response.queued).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/statements",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer token" },
        body: expect.any(FormData),
      }),
    );
  });
});
