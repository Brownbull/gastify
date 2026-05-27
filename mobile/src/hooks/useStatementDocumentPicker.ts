import * as DocumentPicker from "expo-document-picker";
import { useCallback } from "react";
import { useStatementStore, type StatementPdfAsset } from "../stores/statementStore";

const DOCUMENT_PICKER_OPTIONS: DocumentPicker.DocumentPickerOptions = {
  copyToCacheDirectory: true,
  multiple: false,
  type: "application/pdf",
};

export function useStatementDocumentPicker() {
  const uploadFailed = useStatementStore((state) => state.uploadFailed);

  const choosePdf = useCallback(async (): Promise<StatementPdfAsset | null> => {
    try {
      const result = await DocumentPicker.getDocumentAsync(DOCUMENT_PICKER_OPTIONS);
      if (result.canceled) return null;
      return toStatementPdfAsset(result.assets[0]);
    } catch (err: unknown) {
      uploadFailed(
        "document_picker_error",
        err instanceof Error ? err.message : "PDF picker failed",
      );
      return null;
    }
  }, [uploadFailed]);

  return { choosePdf };
}

export function toStatementPdfAsset(
  asset: DocumentPicker.DocumentPickerAsset,
): StatementPdfAsset {
  return {
    uri: asset.uri,
    fileName: asset.name || "statement.pdf",
    mimeType: asset.mimeType ?? "application/pdf",
    fileSize: asset.size,
  };
}
