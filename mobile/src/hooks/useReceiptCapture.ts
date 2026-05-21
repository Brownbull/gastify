import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";
import { useScanUpload } from "./useScanUpload";
import {
  useScanStore,
  type ReceiptScanAsset,
} from "../stores/scanStore";

const IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  allowsEditing: false,
  mediaTypes: ["images"],
  quality: 0.9,
};

export function useReceiptCapture() {
  const failScan = useScanStore((state) => state.failScan);
  const { isUploading, runTestCase, uploadAsset } = useScanUpload();

  const captureFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      failScan(
        "camera_permission_denied",
        "Camera permission is required to scan receipts",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);
    if (result.canceled) return;

    await uploadAsset(toReceiptScanAsset(result.assets[0], "camera"));
  }, [failScan, uploadAsset]);

  const chooseFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      failScan(
        "media_permission_denied",
        "Photo library permission is required to choose a receipt image",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);
    if (result.canceled) return;

    await uploadAsset(toReceiptScanAsset(result.assets[0], "library"));
  }, [failScan, uploadAsset]);

  return {
    captureFromCamera,
    chooseFromLibrary,
    isUploading,
    runTestCase,
  };
}

export function toReceiptScanAsset(
  asset: ImagePicker.ImagePickerAsset,
  source: "camera" | "library",
): ReceiptScanAsset {
  const fallbackName = source === "camera" ? "receipt-camera.jpg" : "receipt-image.jpg";

  return {
    uri: asset.uri,
    fileName: asset.fileName ?? fallbackName,
    mimeType: asset.mimeType ?? "image/jpeg",
    fileSize: asset.fileSize,
    width: asset.width,
    height: asset.height,
    source,
  };
}
