import { render, screen } from "@testing-library/react-native";
import { ScopeBanner } from "../ScopeBanner";
import { useScopeStore } from "../../stores/scopeStore";

// The banner looks up the active group's avatar (D75) from the groups list.
jest.mock("../../hooks/useGroups", () => ({ useGroups: jest.fn() }));
import { useGroups } from "../../hooks/useGroups";

const mockGroups = jest.mocked(useGroups);

// D70: the banner names the active group on scope-aware screens (Dashboard +
// Trends) and renders nothing in personal scope.
describe("ScopeBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useScopeStore.setState({ activeScope: { kind: "personal" } });
    mockGroups.mockReturnValue({
      data: [{ id: "g1", name: "Casa Real", role: "owner", member_count: 1, icon: "🎉", color: "#10b981" }],
    } as never);
  });

  it("renders nothing in personal scope", () => {
    render(<ScopeBanner />);
    expect(screen.queryByTestId("dashboard-scope-banner")).toBeNull();
  });

  it("names the active group in group scope", () => {
    useScopeStore.setState({ activeScope: { kind: "group", id: "g1", name: "Casa Real" } });
    render(<ScopeBanner />);
    expect(screen.getByTestId("dashboard-scope-banner")).toBeTruthy();
    expect(screen.getByText(/Viewing group: Casa Real/)).toBeTruthy();
  });

  it("renders the active group's avatar (D75)", () => {
    useScopeStore.setState({ activeScope: { kind: "group", id: "g1", name: "Casa Real" } });
    render(<ScopeBanner />);
    expect(screen.getByTestId("group-avatar")).toBeTruthy();
    expect(screen.getByText("🎉")).toBeTruthy();
  });
});
