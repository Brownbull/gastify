import { mobileConfig } from "../mobileConfig";
import { ScanUploadError } from "../scanUpload";
import { submitScanTestCase } from "../scanTestCases";

jest.mock("../mobileConfig", () => ({
  mobileConfig: {
    apiBaseUrl: "http://localhost:8000",
    scanTestControlsEnabled: false,
  },
}));

jest.mock("../scanUpload", () => {
  class MockScanUploadError extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }

  return {
    getFreshFirebaseIdToken: jest.fn(),
    ScanUploadError: MockScanUploadError,
  };
});

describe("scanTestCases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mobileConfig.scanTestControlsEnabled = false;
  });

  it("refuses direct test-case runs when controls are disabled", async () => {
    await expect(
      submitScanTestCase("happy", {
        fetchImpl: jest.fn(),
        tokenProvider: jest.fn().mockResolvedValue("token-123"),
      }),
    ).rejects.toBeInstanceOf(ScanUploadError);
  });

  it("submits a guarded scan test case run with bearer auth", async () => {
    mobileConfig.scanTestControlsEnabled = true;
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: "scan-123",
        test_case_id: "happy",
      }),
    });

    await expect(
      submitScanTestCase("happy", {
        fetchImpl,
        tokenProvider: jest.fn().mockResolvedValue("token-123"),
      }),
    ).resolves.toEqual({
      id: "scan-123",
      test_case_id: "happy",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/scan-test-cases/happy/runs",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token-123",
        },
      }),
    );
  });
});
