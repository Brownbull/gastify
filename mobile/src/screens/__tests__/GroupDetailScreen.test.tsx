import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { GroupDetailScreen } from "../GroupDetailScreen";

jest.mock("../../hooks/useGroups", () => ({
  useGroup: jest.fn(),
  useCreateInvite: jest.fn(),
  useUpdateMemberRole: jest.fn(),
  useRemoveMember: jest.fn(),
  useSetGroupVisibility: jest.fn(),
  useSetGroupConsent: jest.fn(),
  useGroupTransactions: jest.fn(),
}));

import {
  useGroup,
  useCreateInvite,
  useUpdateMemberRole,
  useRemoveMember,
  useSetGroupVisibility,
  useSetGroupConsent,
  useGroupTransactions,
} from "../../hooks/useGroups";

const mockGroup = jest.mocked(useGroup);
const mockCreateInvite = jest.mocked(useCreateInvite);
const mockUpdateRole = jest.mocked(useUpdateMemberRole);
const mockRemoveMember = jest.mocked(useRemoveMember);
const mockSetVisibility = jest.mocked(useSetGroupVisibility);
const mockSetConsent = jest.mocked(useSetGroupConsent);
const mockTransactions = jest.mocked(useGroupTransactions);

const mutation = (over: Record<string, unknown> = {}) =>
  ({ mutate: jest.fn(), isPending: false, isError: false, data: undefined, ...over }) as never;

const query = (over: Record<string, unknown> = {}) =>
  ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  }) as never;

type Member = {
  user_id: string;
  display_name?: string | null;
  role: "owner" | "admin" | "member";
  shares_detail: boolean;
};

function detailFixture(over: Record<string, unknown> = {}) {
  const members: Member[] = [
    { user_id: "owner-user-1234", display_name: "Owner Ana", role: "owner", shares_detail: false },
    { user_id: "member-user-5678", display_name: "Beto", role: "member", shares_detail: false },
  ];
  return {
    id: "g1",
    name: "Casa",
    role: "owner",
    member_count: 2,
    members,
    member_visibility_enabled: false,
    viewer_shares_detail: false,
    ...over,
  };
}

function renderScreen() {
  return render(<GroupDetailScreen route={{ params: { groupId: "g1" } } as never} />);
}

describe("GroupDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGroup.mockReturnValue(query({ data: detailFixture() }));
    mockCreateInvite.mockReturnValue(mutation());
    mockUpdateRole.mockReturnValue(mutation());
    mockRemoveMember.mockReturnValue(mutation());
    mockSetVisibility.mockReturnValue(mutation());
    mockSetConsent.mockReturnValue(mutation());
    mockTransactions.mockReturnValue(query({ data: [] }));
  });

  it("renders the roster from the group detail", () => {
    renderScreen();
    expect(screen.getByTestId("group-detail-screen")).toBeTruthy();
    expect(screen.getByText("Owner Ana")).toBeTruthy();
    expect(screen.getByText("Beto")).toBeTruthy();
  });

  it("shows role + remove controls to the owner for non-owner members", () => {
    renderScreen();
    expect(screen.getByTestId("member-role-member-user-5678")).toBeTruthy();
    expect(screen.getByTestId("member-remove-member-user-5678")).toBeTruthy();
    // No controls for the owner row itself.
    expect(screen.queryByTestId("member-role-owner-user-1234")).toBeNull();
  });

  it("hides role + remove controls from non-owners", () => {
    mockGroup.mockReturnValue(query({ data: detailFixture({ role: "member" }) }));
    renderScreen();
    expect(screen.queryByTestId("member-role-member-user-5678")).toBeNull();
    expect(screen.queryByTestId("member-remove-member-user-5678")).toBeNull();
  });

  it("toggles a member role through the mutation", () => {
    const mutate = jest.fn();
    mockUpdateRole.mockReturnValue(mutation({ mutate }));
    renderScreen();

    fireEvent.press(screen.getByTestId("member-role-member-user-5678"));
    expect(mutate).toHaveBeenCalledWith({ memberUserId: "member-user-5678", role: "admin" });
  });

  it("toggles visibility through the mutation", () => {
    const mutate = jest.fn();
    mockSetVisibility.mockReturnValue(mutation({ mutate }));
    renderScreen();

    fireEvent.press(screen.getByTestId("visibility-toggle"));
    expect(mutate).toHaveBeenCalledWith(true);
  });

  it("shows the consent toggle only when member visibility is enabled and calls the mutation", () => {
    // Default fixture has visibility disabled → no consent toggle.
    renderScreen();
    expect(screen.queryByTestId("consent-toggle")).toBeNull();

    const mutate = jest.fn();
    mockSetConsent.mockReturnValue(mutation({ mutate }));
    mockGroup.mockReturnValue(
      query({ data: detailFixture({ member_visibility_enabled: true, viewer_shares_detail: false }) }),
    );
    renderScreen();

    const toggle = screen.getByTestId("consent-toggle");
    fireEvent.press(toggle);
    expect(mutate).toHaveBeenCalledWith(true);
  });

  it("reveals the transactions list when toggled and renders a row", () => {
    mockTransactions.mockReturnValue(
      query({
        data: [
          {
            id: "txn-1",
            transaction_date: "2026-06-01",
            merchant: "Jumbo",
            total_minor: 123456,
            currency: "CLP",
            shared_by_user_id: "member-user-5678",
            shared_by_name: "Beto",
            is_own: false,
          },
        ],
      }),
    );
    renderScreen();

    fireEvent.press(screen.getByTestId("group-transactions-toggle"));
    expect(screen.getByTestId("group-transactions")).toBeTruthy();
    const row = screen.getByTestId("group-txn-txn-1");
    expect(within(row).getByText("Jumbo")).toBeTruthy();
    // "Beto" also appears in the roster; scope to the txn row's contributor label.
    expect(within(row).getByText("Beto")).toBeTruthy();
  });

  it("surfaces the loading and error states for the group detail", () => {
    mockGroup.mockReturnValue(query({ data: undefined, isLoading: true }));
    const { rerender } = renderScreen();
    expect(screen.getByTestId("group-detail-loading")).toBeTruthy();

    mockGroup.mockReturnValue(query({ data: undefined, isError: true, error: { message: "boom" } }));
    rerender(<GroupDetailScreen route={{ params: { groupId: "g1" } } as never} />);
    expect(screen.getByTestId("group-detail-error")).toBeTruthy();
  });
});
