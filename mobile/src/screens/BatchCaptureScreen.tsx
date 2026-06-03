import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { toReceiptScanAsset } from "../hooks/useReceiptCapture";
import { mobileConfig } from "../lib/mobileConfig";
import {
  stageBatchInputs,
  type BatchScanInput,
} from "../stores/batchScanStore";
import type { RootStackParamList } from "../types/navigation";

const MAX_BATCH = 10;

const IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  allowsEditing: false,
  mediaTypes: ["images"],
  quality: 0.9,
};

// Mirrors HomeScreen's deterministic scan test cases (backend scan_test_cases
// catalog). Used to assemble a deterministic batch on dev/staging without the
// native picker — the robust device-E2E path.
const LOCAL_TEST_CASES = [
  { id: "happy", label: "Happy" },
  { id: "review", label: "Review" },
  { id: "failure", label: "Failure" },
] as const;

const STAGING_TEST_CASES = [
  { id: "supermarket-super-lider", label: "Supermarket" },
  { id: "restaurant-2001", label: "Restaurant" },
  { id: "gas-copec", label: "Gas" },
] as const;

function visibleScanTestCases(): readonly { id: string; label: string }[] {
  if (!mobileConfig.scanTestControlsEnabled) return [];
  if (mobileConfig.appEnvironment === "production") return [];
  if (mobileConfig.appEnvironment === "staging") return STAGING_TEST_CASES;
  return LOCAL_TEST_CASES;
}

let localIdCounter = 0;
function nextLocalId(): string {
  localIdCounter += 1;
  return `batch-${localIdCounter}`;
}

type BatchCaptureProps = Partial<
  NativeStackScreenProps<RootStackParamList, "BatchCapture">
>;

export function BatchCaptureScreen({ navigation }: BatchCaptureProps = {}) {
  const [inputs, setInputs] = useState<readonly BatchScanInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_BATCH - inputs.length;
  const testCases = visibleScanTestCases();

  const addInputs = useCallback((additions: readonly BatchScanInput[]) => {
    setInputs((prev) => [...prev, ...additions].slice(0, MAX_BATCH));
  }, []);

  const addFromCamera = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is required to capture receipts");
      return;
    }
    const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);
    if (result.canceled) return;
    const asset = toReceiptScanAsset(result.assets[0], "camera");
    addInputs([
      { localId: nextLocalId(), label: asset.fileName, source: { kind: "asset", asset } },
    ]);
  }, [addInputs]);

  const addFromLibrary = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is required to choose receipts");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      ...IMAGE_PICKER_OPTIONS,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (result.canceled) return;
    addInputs(
      result.assets.map((raw) => {
        const asset = toReceiptScanAsset(raw, "library");
        return {
          localId: nextLocalId(),
          label: asset.fileName,
          source: { kind: "asset", asset } as const,
        };
      }),
    );
  }, [addInputs, remaining]);

  const addTestBatch = useCallback(() => {
    setError(null);
    addInputs(
      testCases.map((testCase) => ({
        localId: nextLocalId(),
        label: testCase.label,
        source: { kind: "testCase", caseId: testCase.id } as const,
      })),
    );
  }, [addInputs, testCases]);

  const removeInput = useCallback((localId: string) => {
    setInputs((prev) => prev.filter((i) => i.localId !== localId));
  }, []);

  const startBatch = useCallback(() => {
    if (inputs.length === 0) return;
    stageBatchInputs(inputs);
    navigation?.navigate("BatchReview");
  }, [inputs, navigation]);

  return (
    <ScreenShell>
      <View style={styles.header} testID="batch-capture-screen">
        <Text style={styles.eyebrow}>Gastify mobile</Text>
        <Text style={styles.title}>Batch scan</Text>
        <Text style={styles.body}>
          Capture several receipts, then review them together. Each becomes its
          own transaction.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Add receipts ({inputs.length}/{MAX_BATCH})</Text>
        <View style={styles.buttonRow}>
          <View style={styles.buttonCell}>
            <Button
              title="Add from camera"
              testID="batch-camera-button"
              onPress={() => void addFromCamera()}
              disabled={remaining <= 0}
            />
          </View>
          <View style={styles.buttonCell}>
            <Button
              title="Add from library"
              testID="batch-library-button"
              onPress={() => void addFromLibrary()}
              disabled={remaining <= 0}
            />
          </View>
        </View>

        {testCases.length > 0 ? (
          <View style={styles.testCaseRow} testID="batch-test-controls">
            <Button
              title="Add test batch"
              testID="batch-add-test-batch-button"
              onPress={addTestBatch}
              disabled={remaining <= 0}
            />
          </View>
        ) : null}

        {error ? (
          <Text style={styles.error} testID="batch-capture-error">
            {error}
          </Text>
        ) : null}
      </View>

      {inputs.length > 0 ? (
        <View style={styles.panel} testID="batch-queue">
          <Text style={styles.label}>Queued</Text>
          {inputs.map((input) => (
            <View key={input.localId} style={styles.queueRow} testID="batch-queue-item">
              <Text style={styles.queueLabel} numberOfLines={1}>
                {input.label}
              </Text>
              <Button
                title="Remove"
                testID="batch-queue-remove"
                onPress={() => removeInput(input.localId)}
              />
            </View>
          ))}
          <View style={styles.submitRow}>
            <Button
              title={`Scan ${inputs.length} receipts`}
              testID="batch-scan-submit-button"
              onPress={startBatch}
            />
          </View>
        </View>
      ) : null}

      <Button
        title="Back"
        testID="batch-capture-back-button"
        onPress={() => navigation?.goBack()}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
  },
  buttonCell: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    marginTop: 12,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  header: {
    gap: 10,
    marginBottom: 24,
  },
  label: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  queueLabel: {
    color: "#0f172a",
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    paddingRight: 12,
  },
  queueRow: {
    alignItems: "center",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  submitRow: {
    marginTop: 14,
  },
  testCaseRow: {
    marginTop: 12,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
  },
});
