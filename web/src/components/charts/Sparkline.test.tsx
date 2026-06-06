import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("renders a polyline with one vertex per point", () => {
    const { getByTestId } = render(<Sparkline points={[10, 20, 15, 40]} />);
    const polyline = getByTestId("report-detail-sparkline").querySelector("polyline");
    expect(polyline).not.toBeNull();
    expect(polyline?.getAttribute("points")?.trim().split(/\s+/)).toHaveLength(4);
  });

  it("colours by trend: last > first is up (red)", () => {
    const { getByTestId } = render(<Sparkline points={[10, 50]} />);
    expect(getByTestId("report-detail-sparkline").getAttribute("data-trend")).toBe("up");
  });

  it("colours by trend: last < first is down (green)", () => {
    const { getByTestId } = render(<Sparkline points={[50, 10]} />);
    expect(getByTestId("report-detail-sparkline").getAttribute("data-trend")).toBe("down");
  });

  it("flat series is neutral and still renders a line", () => {
    const { getByTestId } = render(<Sparkline points={[20, 20, 20]} />);
    expect(getByTestId("report-detail-sparkline").getAttribute("data-trend")).toBe("neutral");
  });

  it("renders nothing for a single bucket (no shape)", () => {
    const { container } = render(<Sparkline points={[42]} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
