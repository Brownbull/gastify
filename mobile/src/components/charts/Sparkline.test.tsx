import { render } from "@testing-library/react-native";
import { Sparkline } from "./Sparkline";

jest.mock("../../providers/ThemeProvider", () => ({
  useTheme: () => ({
    colors: { error: "#ef4444", success: "#22c55e", textTertiary: "#64748b" },
  }),
}));

describe("Sparkline", () => {
  it("renders an SVG for >=2 points", () => {
    const { getByTestId } = render(<Sparkline points={[10, 20, 15, 40]} />);
    expect(getByTestId("report-detail-sparkline")).toBeTruthy();
  });

  it("renders nothing for a single bucket (no shape)", () => {
    const { queryByTestId } = render(<Sparkline points={[42]} />);
    expect(queryByTestId("report-detail-sparkline")).toBeNull();
  });

  it("renders a flat series without crashing", () => {
    const { getByTestId } = render(<Sparkline points={[20, 20, 20]} />);
    expect(getByTestId("report-detail-sparkline")).toBeTruthy();
  });
});
