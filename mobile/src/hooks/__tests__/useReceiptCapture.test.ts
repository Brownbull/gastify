import * as ImagePicker from "expo-image-picker";
import { act, renderHook } from "@testing-library/react-native";
import { useReceiptCapture, toReceiptScanAsset } from "../useReceiptCapture";
import { useScanUpload } from "../useScanUpload";
import { useScanStore } from "../../stores/scanStore";

jest.mock("expo-image-picker", () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

jest.mock("../useScanUpload", () => ({
  useScanUpload: jest.fn(),
}));

describe("useReceiptCapture", () => {
  const uploadAsset = jest.fn();
  const runTestCase = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useScanStore.getState().reset();
    jest.mocked(useScanUpload).mockReturnValue({
      cancelUpload: jest.fn(),
      isUploading: false,
      runTestCase,
      uploadAsset,
    });
  });

  it("fails the scan with a recoverable camera-permission state", async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({
      granted: false,
    } as never);
    const { result } = renderHook(() => useReceiptCapture());

    await act(async () => {
      await result.current.captureFromCamera();
    });

    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(uploadAsset).not.toHaveBeenCalled();
    expect(useScanStore.getState()).toMatchObject({
      errorCode: "camera_permission_denied",
      phase: "failed",
    });
  });

  it("fails the scan when photo-library permission is denied", async () => {
    jest
      .mocked(ImagePicker.requestMediaLibraryPermissionsAsync)
      .mockResolvedValue({ granted: false } as never);
    const { result } = renderHook(() => useReceiptCapture());

    await act(async () => {
      await result.current.chooseFromLibrary();
    });

    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(uploadAsset).not.toHaveBeenCalled();
    expect(useScanStore.getState()).toMatchObject({
      errorCode: "media_permission_denied",
      phase: "failed",
    });
  });

  it("uploads a selected library asset with normalized receipt metadata", async () => {
    jest
      .mocked(ImagePicker.requestMediaLibraryPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      assets: [
        {
          fileSize: 2048,
          height: 1600,
          uri: "file:///tmp/library-receipt.heic",
          width: 1200,
        },
      ],
      canceled: false,
    } as never);
    const { result } = renderHook(() => useReceiptCapture());

    await act(async () => {
      await result.current.chooseFromLibrary();
    });

    expect(uploadAsset).toHaveBeenCalledWith({
      fileName: "receipt-image.jpg",
      fileSize: 2048,
      height: 1600,
      mimeType: "image/jpeg",
      source: "library",
      uri: "file:///tmp/library-receipt.heic",
      width: 1200,
    });
  });

  it("keeps picker-to-receipt metadata deterministic for camera assets", () => {
    expect(
      toReceiptScanAsset(
        {
          fileName: "camera-receipt.webp",
          fileSize: 4096,
          height: 1800,
          mimeType: "image/webp",
          uri: "file:///tmp/camera-receipt.webp",
          width: 1400,
        } as never,
        "camera",
      ),
    ).toEqual({
      fileName: "camera-receipt.webp",
      fileSize: 4096,
      height: 1800,
      mimeType: "image/webp",
      source: "camera",
      uri: "file:///tmp/camera-receipt.webp",
      width: 1400,
    });
  });
});
