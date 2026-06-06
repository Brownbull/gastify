import { fireEvent, render } from "@testing-library/react-native";
import { NotificationsScreen } from "../NotificationsScreen";
import { useNotifications } from "../../hooks/useNotifications";

const mockMarkRead = jest.fn();
const mockDelete = jest.fn();
const mockMarkAll = jest.fn();

jest.mock("../../hooks/useNotifications", () => ({
  useNotifications: jest.fn(),
  useUnreadCount: () => ({ data: 1 }),
  useMarkNotificationRead: () => ({ mutate: mockMarkRead, isPending: false }),
  useDeleteNotification: () => ({ mutate: mockDelete, isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutate: mockMarkAll, isPending: false }),
}));

const mockUseNotifications = jest.mocked(useNotifications);
const fetchNextPage = jest.fn();
const refetch = jest.fn();

function setNotifications(rows: unknown[], over: Record<string, unknown> = {}) {
  mockUseNotifications.mockReturnValue({
    data: { pages: [{ cursor: null, has_more: false, data: rows }] },
    error: null,
    fetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isRefetching: false,
    refetch,
    ...over,
  } as never);
}

const unreadRow = {
  id: "n1",
  kind: "scan_complete",
  title: "Boleta escaneada",
  body: "Tu boleta se guardó.",
  data: { transaction_id: "txn-1" },
  read_at: null,
  created_at: "2026-06-01T12:00:00Z",
};

describe("NotificationsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders notification rows from the mocked hook", () => {
    setNotifications([unreadRow]);
    const screen = render(<NotificationsScreen />);
    expect(screen.getByTestId("notifications-screen")).toBeTruthy();
    expect(screen.getByTestId("notifications-row-0")).toBeTruthy();
    expect(screen.getByText("Boleta escaneada")).toBeTruthy();
  });

  it("marks read AND deep-links to the parent transaction on row tap", () => {
    setNotifications([unreadRow]);
    const navigate = jest.fn();
    const screen = render(<NotificationsScreen navigation={{ navigate } as never} />);

    fireEvent.press(screen.getByTestId("notifications-row-0"));

    expect(mockMarkRead).toHaveBeenCalledWith("n1");
    expect(navigate).toHaveBeenCalledWith("TransactionDetail", {
      transactionId: "txn-1",
    });
  });

  it("deletes a notification via the row delete button", () => {
    setNotifications([unreadRow]);
    const screen = render(<NotificationsScreen />);
    fireEvent.press(screen.getByTestId("notifications-delete-0"));
    expect(mockDelete).toHaveBeenCalledWith("n1");
  });

  it("fires mark-all when unread", () => {
    setNotifications([unreadRow]);
    const screen = render(<NotificationsScreen />);
    fireEvent.press(screen.getByTestId("notifications-mark-all"));
    expect(mockMarkAll).toHaveBeenCalled();
  });

  it("shows the empty state with no notifications", () => {
    setNotifications([]);
    const screen = render(<NotificationsScreen />);
    expect(screen.getByTestId("notifications-empty")).toBeTruthy();
    expect(screen.getByText("No notifications")).toBeTruthy();
  });
});
