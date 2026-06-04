import { render, screen, fireEvent } from "@testing-library/react-native";
import { GroupsScreen } from "../GroupsScreen";
import { useScopeStore } from "../../stores/scopeStore";

jest.mock("../../hooks/useGroups", () => ({
  useGroups: jest.fn(),
  useCreateGroup: jest.fn(),
  useLeaveGroup: jest.fn(),
}));

import { useGroups, useCreateGroup, useLeaveGroup } from "../../hooks/useGroups";

const mockGroups = jest.mocked(useGroups);
const mockCreate = jest.mocked(useCreateGroup);
const mockLeave = jest.mocked(useLeaveGroup);

function setList(over: Record<string, unknown> = {}) {
  mockGroups.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  } as never);
}

describe("GroupsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useScopeStore.setState({ activeScope: { kind: "personal" } });
    setList();
    mockCreate.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false } as never);
    mockLeave.mockReturnValue({ mutate: jest.fn(), isPending: false, isError: false } as never);
  });

  it("does not create a group when the name is blank", () => {
    const mutate = jest.fn();
    mockCreate.mockReturnValue({ mutate, isPending: false, isError: false } as never);
    render(<GroupsScreen />);

    fireEvent.press(screen.getByTestId("create-group-button"));
    expect(mutate).not.toHaveBeenCalled();
  });

  it("creates a group with the trimmed name when a name is entered", () => {
    const mutate = jest.fn();
    mockCreate.mockReturnValue({ mutate, isPending: false, isError: false } as never);
    render(<GroupsScreen />);

    fireEvent.changeText(screen.getByTestId("create-group-input"), "  Casa  ");
    fireEvent.press(screen.getByTestId("create-group-button"));

    expect(mutate).toHaveBeenCalledWith("Casa", expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it("resets scope to personal when leaving the active group", () => {
    setList({
      data: [{ id: "g1", name: "Casa", role: "owner", member_count: 1 }],
    });
    // mutate immediately resolves success so the onSuccess scope-reset runs.
    mockLeave.mockReturnValue({
      mutate: (_id: string, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.(),
      isPending: false,
      isError: false,
    } as never);
    useScopeStore.setState({ activeScope: { kind: "group", id: "g1", name: "Casa" } });
    render(<GroupsScreen />);

    fireEvent.press(screen.getByTestId("group-leave-Casa"));

    expect(useScopeStore.getState().activeScope).toEqual({ kind: "personal" });
  });

  it("surfaces a list error (no silent failure)", () => {
    setList({ isError: true, error: { message: "boom" } });
    render(<GroupsScreen />);
    expect(screen.getByTestId("groups-error")).toBeTruthy();
  });
});
