import { render, screen, fireEvent } from "@testing-library/react-native";
import { ScopeSwitcher } from "../ScopeSwitcher";
import { useScopeStore } from "../../stores/scopeStore";

jest.mock("../../hooks/useGroups", () => ({ useGroups: jest.fn() }));
import { useGroups } from "../../hooks/useGroups";

const mockGroups = jest.mocked(useGroups);

describe("ScopeSwitcher (D70 hub scope switch)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useScopeStore.setState({ activeScope: { kind: "personal" } });
  });

  it("renders nothing when the user has no groups", () => {
    mockGroups.mockReturnValue({ data: [] } as never);
    render(<ScopeSwitcher />);
    expect(screen.queryByTestId("scope-switcher")).toBeNull();
  });

  it("switches the whole-app scope to a group and back to personal", () => {
    mockGroups.mockReturnValue({
      data: [{ id: "g1", name: "Casa", role: "owner", member_count: 1 }],
    } as never);
    render(<ScopeSwitcher />);

    fireEvent.press(screen.getByTestId("scope-switcher-toggle"));
    fireEvent.press(screen.getByTestId("scope-option-Casa"));
    expect(useScopeStore.getState().activeScope).toEqual({
      kind: "group",
      id: "g1",
      name: "Casa",
    });

    fireEvent.press(screen.getByTestId("scope-switcher-toggle"));
    fireEvent.press(screen.getByTestId("scope-option-personal"));
    expect(useScopeStore.getState().activeScope).toEqual({ kind: "personal" });
  });
});
