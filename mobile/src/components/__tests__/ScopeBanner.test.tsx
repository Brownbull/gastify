import { render, screen } from "@testing-library/react-native";
import { ScopeBanner } from "../ScopeBanner";
import { useScopeStore } from "../../stores/scopeStore";

// D70: the banner names the active group on scope-aware screens (Dashboard +
// Trends) and renders nothing in personal scope.
describe("ScopeBanner", () => {
  beforeEach(() => {
    useScopeStore.setState({ activeScope: { kind: "personal" } });
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
});
