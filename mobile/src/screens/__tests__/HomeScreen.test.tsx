import { fireEvent, render } from "@testing-library/react-native";
import { HomeScreen } from "../HomeScreen";
import { useReceiptCapture } from "../../hooks/useReceiptCapture";
import { useScanProgressSocket } from "../../hooks/useScanProgressSocket";
import { useInvalidateTransactionsAfterScan } from "../../hooks/useTransactions";
import { mobileConfig } from "../../lib/mobileConfig";
import { useAuth } from "../../providers/AuthProvider";
import { useScanStore, type ReceiptScanAsset } from "../../stores/scanStore";
import { useSessionStore } from "../../stores/sessionStore";

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../hooks/useReceiptCapture", () => ({
  useReceiptCapture: jest.fn(),
}));

jest.mock("../../hooks/useScanProgressSocket", () => ({
  useScanProgressSocket: jest.fn(),
}));

jest.mock("../../hooks/useTransactions", () => ({
  useInvalidateTransactionsAfterScan: jest.fn(),
}));

jest.mock("../../lib/mobileConfig", () => ({
  mobileConfig: {
    apiBaseUrl: "http://localhost:8000",
    appEnvironment: "local",
    scanTestControlsEnabled: false,
  },
}));

describe("HomeScreen", () => {
  const signOut = jest.fn();
  const captureFromCamera = jest.fn();
  const chooseFromLibrary = jest.fn();
  const runTestCase = jest.fn();
  const invalidateTransactionsAfterScan = jest.fn();
  const asset: ReceiptScanAsset = {
    uri: "file:///tmp/receipt.jpg",
    fileName: "receipt.jpg",
    mimeType: "image/jpeg",
    fileSize: 1234,
    source: "camera",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useScanStore.getState().reset();
    useSessionStore.getState().reset();
    jest.mocked(useAuth).mockReturnValue({
      error: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signInWithTestUser: jest.fn(),
      signOut,
      user: {
        uid: "firebase-uid",
      } as never,
    });
    jest.mocked(useReceiptCapture).mockReturnValue({
      captureFromCamera,
      chooseFromLibrary,
      isUploading: false,
      runTestCase,
    });
    jest
      .mocked(useInvalidateTransactionsAfterScan)
      .mockReturnValue(invalidateTransactionsAfterScan);
    mobileConfig.appEnvironment = "local";
    mobileConfig.scanTestControlsEnabled = false;
  });

  it("shows signed-in user state and exposes sign-out by stable testID", () => {
    useSessionStore.getState().setSignedInUser({
      displayName: "Test User",
      email: "test@example.com",
      uid: "firebase-uid",
    });

    const screen = render(<HomeScreen />);

    expect(screen.getByTestId("home-screen")).toBeTruthy();
    expect(screen.getByTestId("signed-in-user-value").props.children).toBe(
      "test@example.com",
    );

    fireEvent.press(screen.getByTestId("sign-out-button"));
    expect(signOut).toHaveBeenCalled();
    expect(useScanProgressSocket).toHaveBeenCalled();
  });

  it("exposes camera and library scan actions", () => {
    const screen = render(<HomeScreen />);

    fireEvent.press(screen.getByTestId("scan-camera-button"));
    fireEvent.press(screen.getByTestId("scan-library-button"));

    expect(captureFromCamera).toHaveBeenCalled();
    expect(chooseFromLibrary).toHaveBeenCalled();
  });

  it("opens the transaction ledger from the home screen", () => {
    const navigate = jest.fn();
    const screen = render(
      <HomeScreen navigation={{ navigate } as never} />,
    );

    fireEvent.press(screen.getByTestId("open-ledger-button"));

    expect(navigate).toHaveBeenCalledWith("Transactions");
  });

  it("hides scan test controls unless enabled", () => {
    const screen = render(<HomeScreen />);

    expect(screen.queryByTestId("scan-test-controls-panel")).toBeNull();
  });

  it("shows local direct scan test cases when enabled", () => {
    mobileConfig.scanTestControlsEnabled = true;
    mobileConfig.appEnvironment = "local";

    const screen = render(<HomeScreen />);

    expect(screen.getByTestId("scan-test-controls-panel")).toBeTruthy();
    fireEvent.press(screen.getByTestId("scan-test-case-happy-button"));
    expect(runTestCase).toHaveBeenCalledWith("happy");
  });

  it("shows staging curated scan test cases when enabled", () => {
    mobileConfig.scanTestControlsEnabled = true;
    mobileConfig.appEnvironment = "staging";

    const screen = render(<HomeScreen />);

    expect(screen.getByTestId("scan-test-case-supermarket-super-lider-button")).toBeTruthy();
    expect(screen.queryByTestId("scan-test-case-happy-button")).toBeNull();
  });

  it("never shows scan test controls in production", () => {
    mobileConfig.scanTestControlsEnabled = true;
    mobileConfig.appEnvironment = "production";

    const screen = render(<HomeScreen />);

    expect(screen.queryByTestId("scan-test-controls-panel")).toBeNull();
  });

  it("renders selected image and staged backend progress", () => {
    useScanStore.getState().startUpload(asset);
    useScanStore.getState().uploadComplete({
      id: "scan-123",
      ownership_scope_id: "scope-1",
      status: "queued",
      original_filename: "receipt.jpg",
      content_type: "image/jpeg",
      file_size_bytes: 1234,
      image_path: "scans/scan-123/original.jpg",
      submitted_at: "2026-05-17T12:00:00Z",
    });
    useScanStore.getState().receiveEvent({
      event_type: "extraction_complete",
      scan_id: "scan-123",
      step: "stage1",
      progress_pct: 40,
    });

    const screen = render(<HomeScreen />);

    expect(screen.getByTestId("scan-image-preview")).toBeTruthy();
    expect(screen.getByTestId("scan-progress-panel")).toBeTruthy();
    expect(screen.getByText("Extracting")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
  });

  it("renders completed scan review signals from backend result data", () => {
    useScanStore.getState().uploadComplete({
      id: "scan-123",
      ownership_scope_id: "scope-1",
      status: "queued",
      original_filename: "receipt.jpg",
      content_type: "image/jpeg",
      file_size_bytes: 1234,
      image_path: "scans/scan-123/original.jpg",
      submitted_at: "2026-05-17T12:00:00Z",
    });
    useScanStore.getState().receiveEvent({
      event_type: "scan_complete",
      scan_id: "scan-123",
      step: "done",
      progress_pct: 100,
      data: {
        status: "needs_review",
        transaction_id: "txn-123",
        confidence_score: 0.42,
        is_unknown_merchant: true,
      },
    });

    const screen = render(<HomeScreen />);

    expect(screen.getByTestId("scan-result-panel")).toBeTruthy();
    expect(screen.getByTestId("low-confidence-alert")).toBeTruthy();
    expect(screen.getByTestId("merchant-review-alert")).toBeTruthy();
    expect(screen.getByTestId("scan-view-transaction-button")).toBeTruthy();
    expect(invalidateTransactionsAfterScan).toHaveBeenCalledWith("txn-123");
  });

  it("opens the completed scan transaction when the backend returns an id", () => {
    const navigate = jest.fn();
    useScanStore.getState().uploadComplete({
      id: "scan-123",
      ownership_scope_id: "scope-1",
      status: "queued",
      original_filename: "receipt.jpg",
      content_type: "image/jpeg",
      file_size_bytes: 1234,
      image_path: "scans/scan-123/original.jpg",
      submitted_at: "2026-05-17T12:00:00Z",
    });
    useScanStore.getState().receiveEvent({
      event_type: "scan_complete",
      scan_id: "scan-123",
      step: "done",
      progress_pct: 100,
      data: {
        transaction_id: "txn-123",
      },
    });

    const screen = render(
      <HomeScreen navigation={{ navigate } as never} />,
    );

    fireEvent.press(screen.getByTestId("scan-view-transaction-button"));

    expect(navigate).toHaveBeenCalledWith("TransactionDetail", {
      transactionId: "txn-123",
    });
  });
});
