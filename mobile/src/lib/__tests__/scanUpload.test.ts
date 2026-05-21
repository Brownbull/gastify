import auth from "@react-native-firebase/auth";
import {
  MAX_RECEIPT_IMAGE_BYTES,
  ScanUploadError,
  submitReceiptScan,
  validateReceiptScanAsset,
} from "../scanUpload";
import type { ReceiptScanAsset } from "../../stores/scanStore";

jest.mock("@react-native-firebase/auth", () => jest.fn());

class TestFormData {
  readonly parts: Array<[string, unknown]> = [];

  append(name: string, value: unknown) {
    this.parts.push([name, value]);
  }
}

const originalFormData = global.FormData;

const baseAsset: ReceiptScanAsset = {
  uri: "file:///tmp/receipt.jpg",
  fileName: "receipt.jpg",
  mimeType: "image/jpeg",
  fileSize: 1234,
  source: "camera",
};

describe("scanUpload", () => {
  beforeAll(() => {
    global.FormData = TestFormData as unknown as typeof FormData;
  });

  afterAll(() => {
    global.FormData = originalFormData;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(auth).mockReturnValue({
      currentUser: {
        getIdToken: jest.fn().mockResolvedValue("firebase-token"),
      },
    } as never);
  });

  it("validates supported receipt image assets and infers normalized file metadata", () => {
    expect(
      validateReceiptScanAsset({
        ...baseAsset,
        fileName: "",
        mimeType: "image",
        uri: "file:///tmp/receipt.png",
      }),
    ).toEqual({
      uri: "file:///tmp/receipt.png",
      name: "receipt.png",
      type: "image/png",
    });
  });

  it("rejects unsupported or oversized receipt images before upload", () => {
    expect(() =>
      validateReceiptScanAsset({
        ...baseAsset,
        fileName: "receipt.pdf",
        mimeType: "application/pdf",
      }),
    ).toThrow(ScanUploadError);

    expect(() =>
      validateReceiptScanAsset({
        ...baseAsset,
        fileSize: MAX_RECEIPT_IMAGE_BYTES + 1,
      }),
    ).toThrow(ScanUploadError);
  });

  it("submits the receipt image to the backend scan endpoint with bearer auth", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: "scan-123",
        status: "queued",
      }),
    });

    await expect(
      submitReceiptScan(baseAsset, {
        fetchImpl,
        tokenProvider: jest.fn().mockResolvedValue("token-123"),
      }),
    ).resolves.toEqual({
      id: "scan-123",
      status: "queued",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/scans",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token-123",
        },
        body: expect.any(TestFormData),
      }),
    );

    const body = fetchImpl.mock.calls[0]?.[1]?.body as TestFormData;
    expect(body.parts).toEqual([
      [
        "file",
        {
          uri: "file:///tmp/receipt.jpg",
          name: "receipt.jpg",
          type: "image/jpeg",
        },
      ],
    ]);
  });

  it("maps auth and backend validation failures to stable scan error codes", async () => {
    await expect(
      submitReceiptScan(baseAsset, {
        fetchImpl: jest.fn(),
        tokenProvider: jest.fn().mockResolvedValue(null),
      }),
    ).rejects.toMatchObject({
      code: "auth_error",
    });

    await expect(
      submitReceiptScan(baseAsset, {
        fetchImpl: jest.fn().mockResolvedValue({
          ok: false,
          status: 422,
          json: jest.fn().mockResolvedValue({ detail: [{ msg: "bad image" }] }),
        }),
        tokenProvider: jest.fn().mockResolvedValue("token-123"),
      }),
    ).rejects.toMatchObject({
      code: "invalid_image",
      message: "The selected image did not pass upload validation",
    });
  });
});
