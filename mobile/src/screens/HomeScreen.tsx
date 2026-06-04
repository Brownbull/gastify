import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, Button, Image, StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { useReceiptCapture } from "../hooks/useReceiptCapture";
import { usePushRegistration } from "../hooks/usePushRegistration";
import { useScanProgressSocket } from "../hooks/useScanProgressSocket";
import { useInvalidateTransactionsAfterScan } from "../hooks/useTransactions";
import { mobileConfig } from "../lib/mobileConfig";
import { useAuth } from "../providers/AuthProvider";
import {
  useScanStore,
  type ScanResultData,
  type ScanPhase,
} from "../stores/scanStore";
import { useSessionStore } from "../stores/sessionStore";
import type { RootStackParamList } from "../types/navigation";

const STAGES: readonly { phase: ScanPhase; label: string; description: string }[] = [
  { phase: "submitted", label: "Submitted", description: "Receipt received" },
  { phase: "processing", label: "Processing", description: "Preparing image" },
  { phase: "extracting", label: "Extracting", description: "Reading receipt data" },
  { phase: "categorizing", label: "Categorizing", description: "Classifying items" },
  { phase: "verified", label: "Verified", description: "Math checks" },
  { phase: "complete", label: "Complete", description: "Transaction ready" },
];

const PHASE_ORDER = STAGES.reduce<Record<string, number>>((acc, stage, index) => {
  acc[stage.phase] = index;
  return acc;
}, {});

const LOCAL_TEST_CASES = [
  { id: "happy", label: "Happy" },
  { id: "review", label: "Review" },
  { id: "failure", label: "Failure" },
] as const;

const STAGING_TEST_CASES = [
  { id: "supermarket-super-lider", label: "Supermarket" },
  { id: "restaurant-2001", label: "Restaurant" },
  { id: "gas-copec", label: "Gas" },
  { id: "adversarial-chilean-thousands", label: "Thousands" },
] as const;

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  auth_error: {
    title: "Authentication error",
    body: "Sign in again before scanning.",
  },
  camera_permission_denied: {
    title: "Camera permission denied",
    body: "Enable camera access to capture receipts.",
  },
  connection_lost: {
    title: "Connection lost",
    body: "Scan progress stopped updating after reconnect attempts.",
  },
  file_too_large: {
    title: "Image too large",
    body: "Receipt images must be 20 MB or smaller.",
  },
  invalid_file: {
    title: "Invalid image",
    body: "Choose a receipt image with a local file URI.",
  },
  invalid_file_type: {
    title: "Unsupported image",
    body: "Choose a JPG, PNG, WebP, HEIC, or HEIF image.",
  },
  invalid_image: {
    title: "Invalid image",
    body: "The selected file could not be processed as a receipt image.",
  },
  media_permission_denied: {
    title: "Photo permission denied",
    body: "Enable photo access to select receipt images.",
  },
  rate_limit: {
    title: "Too many scans",
    body: "Wait a moment before submitting another receipt.",
  },
  scan_not_found: {
    title: "Scan not found",
    body: "The scan stream could not find this receipt.",
  },
  server_error: {
    title: "Server error",
    body: "The scan service could not process the request.",
  },
  upload_error: {
    title: "Upload failed",
    body: "Check the connection and submit the receipt again.",
  },
  unknown_error: {
    title: "Scan error",
    body: "The receipt could not be processed.",
  },
};

type HomeScreenProps = Partial<NativeStackScreenProps<RootStackParamList, "Home">>;

export function HomeScreen({ navigation }: HomeScreenProps = {}) {
  useScanProgressSocket();

  const { signOut } = useAuth();
  const invalidateTransactionsAfterScan = useInvalidateTransactionsAfterScan();
  const signedInUser = useSessionStore((state) => state.signedInUser);
  const pushRegistration = usePushRegistration();
  const phase = useScanStore((state) => state.phase);
  const selectedAsset = useScanStore((state) => state.selectedAsset);
  const connectionStatus = useScanStore((state) => state.connectionStatus);
  const reconnectAttempt = useScanStore((state) => state.reconnectAttempt);
  const connectionMessage = useScanStore((state) => state.connectionMessage);
  const progressPct = useScanStore((state) => state.progressPct);
  const result = useScanStore((state) => state.result);
  const errorCode = useScanStore((state) => state.errorCode);
  const errorMessage = useScanStore((state) => state.errorMessage);
  const resetScan = useScanStore((state) => state.reset);
  const { captureFromCamera, chooseFromLibrary, isUploading, runTestCase } =
    useReceiptCapture();

  const scanLocked = phase !== "idle" && phase !== "failed" && phase !== "complete";
  const scanTestCases = getVisibleScanTestCases();
  const resultTransactionId =
    typeof result?.transaction_id === "string" ? result.transaction_id : null;

  useEffect(() => {
    if (phase === "complete") {
      invalidateTransactionsAfterScan(resultTransactionId);
    }
  }, [invalidateTransactionsAfterScan, phase, resultTransactionId]);

  return (
    <ScreenShell>
      <View style={styles.header} testID="home-screen">
        <Text style={styles.eyebrow}>Gastify mobile</Text>
        <Text style={styles.title}>Capture-ready account</Text>
        <Text style={styles.body}>
          The native shell is connected to Firebase Auth, SecureStore, and the
          typed backend client.
        </Text>
      </View>

      <View style={styles.panel} testID="signed-in-user-panel">
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value} testID="signed-in-user-value">
          {signedInUser?.email ?? signedInUser?.displayName ?? signedInUser?.uid}
        </Text>
      </View>

      <View style={styles.panel} testID="api-base-url-panel">
        <Text style={styles.label}>API base URL</Text>
        <Text style={styles.value}>{mobileConfig.apiBaseUrl}</Text>
      </View>

      <View style={styles.panel} testID="ledger-entry-panel">
        <Text style={styles.label}>Ledger</Text>
        <Text style={styles.panelTitle}>Transactions and edits</Text>
        <View style={styles.actionStack}>
          <Button
            title="Open ledger"
            testID="open-ledger-button"
            onPress={() => navigation?.navigate("Transactions")}
          />
          <Button
            title="Open statements"
            testID="open-statements-button"
            onPress={() => navigation?.navigate("Statements")}
          />
          <Button
            title="Open dashboard"
            testID="open-dashboard-button"
            onPress={() => navigation?.navigate("Dashboard")}
          />
          <Button
            title="Open groups"
            testID="open-groups-button"
            onPress={() => navigation?.navigate("Groups")}
          />
          <Button
            title="Settings"
            testID="open-settings-button"
            onPress={() => navigation?.navigate("Settings")}
          />
        </View>
      </View>

      <View style={styles.panel} testID="push-registration-panel">
        <Text style={styles.label}>Notifications</Text>
        <Text style={styles.panelTitle}>
          {pushRegistrationTitle(pushRegistration.status)}
        </Text>
        <Text style={styles.panelBody}>
          {pushRegistrationBody(
            pushRegistration.status,
            pushRegistration.permissionStatus,
            pushRegistration.errorMessage,
          )}
        </Text>
        <View style={styles.panelAction}>
          {pushRegistration.status === "registered" ? (
            <Button
              title="Disable notifications"
              testID="push-unregister-button"
              onPress={() => void pushRegistration.unregister()}
              disabled={pushRegistration.isRegistering}
            />
          ) : (
            <Button
              title="Enable notifications"
              testID="push-register-button"
              onPress={() => void pushRegistration.register()}
              disabled={pushRegistration.isRegistering}
            />
          )}
        </View>
      </View>

      <View style={styles.panel} testID="scan-capture-panel">
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.label}>Receipt scan</Text>
            <Text style={styles.panelTitle}>Camera and image upload</Text>
          </View>
          {isUploading ? <ActivityIndicator color="#2563eb" /> : null}
        </View>

        <View style={styles.buttonRow}>
          <View style={styles.buttonCell}>
            <Button
              title="Open camera"
              testID="scan-camera-button"
              onPress={() => void captureFromCamera()}
              disabled={scanLocked}
            />
          </View>
          <View style={styles.buttonCell}>
            <Button
              title="Choose image"
              testID="scan-library-button"
              onPress={() => void chooseFromLibrary()}
              disabled={scanLocked}
            />
          </View>
        </View>

        <View style={styles.batchEntryRow}>
          <Button
            title="Scan multiple receipts"
            testID="open-batch-scan-button"
            onPress={() => navigation?.navigate("BatchCapture")}
            disabled={scanLocked}
          />
        </View>

        {scanTestCases.length > 0 ? (
          <View style={styles.testCasePanel} testID="scan-test-controls-panel">
            <Text style={styles.label}>Test cases</Text>
            <View style={styles.testCaseGrid}>
              {scanTestCases.map((testCase) => (
                <View key={testCase.id} style={styles.testCaseButton}>
                  <Button
                    title={testCase.label}
                    testID={`scan-test-case-${testCase.id}-button`}
                    onPress={() => void runTestCase(testCase.id)}
                    disabled={scanLocked}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {selectedAsset ? <ImagePreview /> : null}
        <ScanProgress
          connectionMessage={connectionMessage}
          connectionStatus={connectionStatus}
          phase={phase}
          progressPct={progressPct}
          reconnectAttempt={reconnectAttempt}
        />
        <ScanResult
          result={result}
          phase={phase}
          onOpenTransaction={(transactionId) =>
            navigation?.navigate("TransactionDetail", { transactionId })
          }
          onReset={resetScan}
        />
        <ScanError
          errorCode={errorCode}
          errorMessage={errorMessage}
          phase={phase}
          onReset={resetScan}
        />
      </View>

      <Button
        title="Sign out"
        testID="sign-out-button"
        onPress={() => void signOut()}
      />
    </ScreenShell>
  );
}

function ImagePreview() {
  const asset = useScanStore((state) => state.selectedAsset);
  if (!asset) return null;

  if (asset.source === "test-case") {
    return (
      <View style={styles.previewRow} testID="scan-test-case-preview">
        <View style={styles.previewBadge}>
          <Text style={styles.previewBadgeText}>TC</Text>
        </View>
        <View style={styles.previewMeta}>
          <Text style={styles.previewTitle}>{asset.fileName}</Text>
          <Text style={styles.previewDetail}>Non-production test case</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.previewRow} testID="scan-image-preview">
      <Image source={{ uri: asset.uri }} style={styles.previewImage} />
      <View style={styles.previewMeta}>
        <Text style={styles.previewTitle}>{asset.fileName}</Text>
        <Text style={styles.previewDetail}>
          {asset.mimeType} {asset.fileSize ? `- ${formatBytes(asset.fileSize)}` : ""}
        </Text>
      </View>
    </View>
  );
}

function pushRegistrationTitle(status: string): string {
  if (status === "registered") return "Device registered";
  if (status === "denied") return "Permission denied";
  if (status === "failed") return "Registration failed";
  if (status === "requesting") return "Registering device";
  if (status === "unregistered") return "Device unregistered";
  return "Device push setup";
}

function pushRegistrationBody(
  status: string,
  permissionStatus: string,
  errorMessage: string | null,
): string {
  if (status === "registered") {
    return "Push token is registered for this account.";
  }
  if (status === "denied") {
    return `Permission status: ${permissionStatus}.`;
  }
  if (status === "failed") {
    return errorMessage ?? "Push registration failed.";
  }
  if (status === "requesting") {
    return "Requesting notification permission.";
  }
  if (status === "unregistered") {
    return "Push token was unregistered.";
  }
  return "Register this device to receive scan and account updates.";
}

function ScanProgress({
  connectionMessage,
  connectionStatus,
  phase,
  progressPct,
  reconnectAttempt,
}: {
  connectionMessage: string | null;
  connectionStatus: string;
  phase: ScanPhase;
  progressPct: number;
  reconnectAttempt: number;
}) {
  if (phase === "idle" || phase === "failed" || phase === "complete") return null;

  return (
    <View style={styles.progressPanel} testID="scan-progress-panel">
      <View style={styles.progressHeader}>
        <Text style={styles.panelTitle}>
          {phase === "uploading" ? "Uploading receipt" : "Scanning receipt"}
        </Text>
        {progressPct > 0 ? <Text style={styles.progressPct}>{progressPct}%</Text> : null}
      </View>
      {connectionMessage ? (
        <Text style={styles.connectionText} testID="scan-connection-status">
          {connectionMessage}
        </Text>
      ) : null}
      {connectionStatus === "reconnecting" ? (
        <Text style={styles.connectionText}>Reconnect attempt {reconnectAttempt}</Text>
      ) : null}
      {phase === "uploading" ? (
        <View style={styles.uploadBar}>
          <View style={styles.uploadBarFill} />
        </View>
      ) : (
        <View style={styles.stageList}>
          {STAGES.map((stage) => (
            <StageRow key={stage.phase} currentPhase={phase} stage={stage} />
          ))}
        </View>
      )}
    </View>
  );
}

function StageRow({
  currentPhase,
  stage,
}: {
  currentPhase: ScanPhase;
  stage: { phase: ScanPhase; label: string; description: string };
}) {
  const status = getStageStatus(stage.phase, currentPhase);

  return (
    <View style={styles.stageRow}>
      <View
        style={[
          styles.stageDot,
          status === "done" && styles.stageDotDone,
          status === "active" && styles.stageDotActive,
        ]}
      />
      <View>
        <Text
          style={[
            styles.stageLabel,
            status === "pending" && styles.stageTextPending,
          ]}
        >
          {stage.label}
        </Text>
        <Text style={styles.stageDescription}>{stage.description}</Text>
      </View>
    </View>
  );
}

function ScanResult({
  onOpenTransaction,
  onReset,
  phase,
  result,
}: {
  onOpenTransaction?: (transactionId: string) => void;
  onReset: () => void;
  phase: ScanPhase;
  result: ScanResultData | null;
}) {
  if (phase !== "complete") return null;

  const status = result?.status ?? "completed";
  const confidence = result?.confidence_score ?? null;
  const isLowConfidence = confidence != null && confidence < 0.6;
  const hasMajorReconciliationWarning =
    result?.reconciliation_severity === "major_warning";
  const needsMerchantReview =
    result?.is_new_merchant === true || result?.is_unknown_merchant === true;
  const currency = result?.currency_code;
  const transactionId =
    typeof result?.transaction_id === "string" ? result.transaction_id : null;

  return (
    <View style={styles.resultPanel} testID="scan-result-panel">
      <Text style={styles.resultTitle}>
        {status === "needs_review" ? "Scan needs review" : "Scan complete"}
      </Text>
      <Text style={styles.resultBody}>
        {status === "needs_review"
          ? "The receipt was processed but needs review before it can be trusted."
          : "The receipt was processed and is ready for the ledger."}
      </Text>
      {isLowConfidence ? (
        <View style={styles.warningBox} testID="low-confidence-alert">
          <Text style={styles.warningText}>Low confidence scan</Text>
        </View>
      ) : null}
      {hasMajorReconciliationWarning ? (
        <View style={styles.warningBox} testID="reconciliation-warning-alert">
          <Text style={styles.warningText}>Receipt math needs review</Text>
        </View>
      ) : null}
      {needsMerchantReview ? (
        <View style={styles.infoBox} testID="merchant-review-alert">
          <Text style={styles.infoText}>Merchant needs review</Text>
        </View>
      ) : null}
      {result?.total_amount != null ? (
        <View style={styles.resultSummary} testID="scan-result-amounts">
          <View style={styles.resultMetric}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.resultItemAmount}>
              {formatMinorAmount(result.total_amount, currency)}
            </Text>
          </View>
          {result.gross_total_amount != null ? (
            <View style={styles.resultMetric}>
              <Text style={styles.label}>Before discount</Text>
              <Text style={styles.resultItemAmount}>
                {formatMinorAmount(result.gross_total_amount, currency)}
              </Text>
            </View>
          ) : null}
          {result.discount_amount != null ? (
            <View style={styles.resultMetric}>
              <Text style={styles.label}>Discount</Text>
              <Text style={styles.resultItemDiscount}>
                -{formatMinorAmount(result.discount_amount, currency)}
              </Text>
            </View>
          ) : null}
          {result.reconstructed_total != null && status === "needs_review" ? (
            <View style={styles.resultMetric}>
              <Text style={styles.label}>Reconstructed</Text>
              <Text style={styles.resultItemAmount}>
                {formatMinorAmount(result.reconstructed_total, currency)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {result?.line_items && result.line_items.length > 0 ? (
        <View style={styles.resultItems} testID="scan-result-line-items">
          {result.line_items.slice(0, 5).map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.resultItemRow}>
              <View style={styles.resultItemName}>
                <Text style={styles.value}>
                  {item.qty != null && item.qty > 1 ? `${item.qty} x ` : ""}
                  {item.name}
                </Text>
              </View>
              <Text style={styles.resultItemAmount}>
                {formatMinorAmount(item.total_price, currency)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {transactionId ? (
        <View style={styles.resultAction}>
          <Button
            title="View transaction"
            testID="scan-view-transaction-button"
            onPress={() => onOpenTransaction?.(transactionId)}
          />
        </View>
      ) : null}
      <Button title="Scan another" testID="scan-reset-button" onPress={onReset} />
    </View>
  );
}

function ScanError({
  errorCode,
  errorMessage,
  onReset,
  phase,
}: {
  errorCode: string | null;
  errorMessage: string | null;
  onReset: () => void;
  phase: ScanPhase;
}) {
  if (phase !== "failed") return null;

  const copy = ERROR_COPY[errorCode ?? ""] ?? ERROR_COPY.unknown_error;

  return (
    <View style={styles.errorPanel} testID="scan-error-panel">
      <Text style={styles.errorTitle}>{copy.title}</Text>
      <Text style={styles.errorBody}>{copy.body}</Text>
      {errorMessage && errorMessage !== copy.body ? (
        <Text style={styles.errorDetail}>{errorMessage}</Text>
      ) : null}
      <Button title="Reset scan" testID="scan-error-reset-button" onPress={onReset} />
    </View>
  );
}

function getStageStatus(
  stagePhase: ScanPhase,
  currentPhase: ScanPhase,
): "done" | "active" | "pending" {
  const stageIdx = PHASE_ORDER[stagePhase] ?? -1;
  const currentIdx = PHASE_ORDER[currentPhase] ?? -1;
  if (currentIdx > stageIdx) return "done";
  if (currentIdx === stageIdx) return "active";
  return "pending";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMinorAmount(amount: number, currency = "CLP"): string {
  const exponent = currency === "CLP" || currency === "JPY" ? 0 : 2;
  const majorAmount = amount / 10 ** exponent;
  try {
    return new Intl.NumberFormat(undefined, {
      currency,
      maximumFractionDigits: exponent,
      minimumFractionDigits: exponent,
      style: "currency",
    }).format(majorAmount);
  } catch {
    return `${currency} ${majorAmount.toFixed(exponent)}`;
  }
}

function getVisibleScanTestCases() {
  if (!mobileConfig.scanTestControlsEnabled) return [];
  if (mobileConfig.appEnvironment === "production") return [];
  if (mobileConfig.appEnvironment === "staging") return STAGING_TEST_CASES;
  return LOCAL_TEST_CASES;
}

const styles = StyleSheet.create({
  batchEntryRow: {
    marginTop: 12,
  },
  body: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 23,
  },
  buttonCell: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  connectionText: {
    color: "#475569",
    fontSize: 13,
    marginTop: 8,
  },
  errorBody: {
    color: "#7f1d1d",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  errorDetail: {
    color: "#991b1b",
    fontSize: 12,
    marginBottom: 12,
  },
  errorPanel: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  errorTitle: {
    color: "#991b1b",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  header: {
    gap: 10,
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  infoText: {
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "700",
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
  panelAction: {
    marginTop: 14,
  },
  actionStack: {
    gap: 10,
    marginTop: 14,
  },
  panelBody: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  panelHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  panelTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
  },
  previewDetail: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  previewBadge: {
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderColor: "#7dd3fc",
    borderRadius: 8,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  previewBadgeText: {
    color: "#0369a1",
    fontSize: 14,
    fontWeight: "800",
  },
  previewImage: {
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    height: 56,
    width: 56,
  },
  previewMeta: {
    flex: 1,
  },
  previewRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  previewTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressPanel: {
    marginTop: 16,
  },
  progressPct: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "800",
  },
  resultBody: {
    color: "#14532d",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  resultItemAmount: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "800",
  },
  resultItemDiscount: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  resultItemName: {
    flex: 1,
    paddingRight: 10,
  },
  resultItemRow: {
    alignItems: "flex-start",
    borderTopColor: "#bbf7d0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  resultItems: {
    marginBottom: 14,
  },
  resultMetric: {
    flex: 1,
  },
  resultPanel: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  resultAction: {
    marginBottom: 10,
  },
  resultSummary: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  resultTitle: {
    color: "#166534",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  stageDescription: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  stageDot: {
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    marginTop: 3,
    width: 16,
  },
  stageDotActive: {
    backgroundColor: "#bfdbfe",
    borderColor: "#2563eb",
  },
  stageDotDone: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  stageLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  stageList: {
    gap: 10,
    marginTop: 14,
  },
  stageRow: {
    flexDirection: "row",
    gap: 10,
  },
  stageTextPending: {
    color: "#94a3b8",
  },
  testCaseButton: {
    minWidth: "47%",
  },
  testCaseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  testCasePanel: {
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 16,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0,
  },
  uploadBar: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    height: 8,
    marginTop: 14,
    overflow: "hidden",
  },
  uploadBarFill: {
    backgroundColor: "#2563eb",
    borderRadius: 999,
    height: 8,
    opacity: 0.5,
    width: "100%",
  },
  value: {
    color: "#0f172a",
    fontSize: 16,
    lineHeight: 22,
  },
  warningBox: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  warningText: {
    color: "#92400e",
    fontSize: 14,
    fontWeight: "700",
  },
});
