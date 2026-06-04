import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Route } from "./scan";

// D70: scanning is personal-only. In group scope ScanPage must render the
// PersonalOnlyNotice and NOT the scanner. (The web Playwright proof covers the
// live path; this is the fast unit guard against a regression flipping it.)
vi.mock("@/stores/uiStore", () => ({ useUiStore: vi.fn() }));
vi.mock("@/hooks/useScanUpload", () => ({
  useScanUpload: () => ({ upload: vi.fn(), isUploading: false }),
}));
vi.mock("@/hooks/useScanStream", () => ({ useScanStream: vi.fn() }));
vi.mock("@/stores/scanStore", () => {
  const fn = vi.fn((selector: (s: { phase: string }) => unknown) => selector({ phase: "idle" }));
  return { useScanStore: Object.assign(fn, { getState: () => ({ reset: vi.fn() }) }) };
});

import { useUiStore } from "@/stores/uiStore";

const mockUiStore = vi.mocked(useUiStore);
const ScanPage = Route.options.component as () => React.ReactElement;

type Scope = { kind: "personal" } | { kind: "group"; id: string; name: string };
function setScope(scope: Scope) {
  mockUiStore.mockImplementation((selector: (s: { activeScope: Scope }) => unknown) =>
    selector({ activeScope: scope }),
  );
}

describe("ScanPage — D70 scan-personal-only guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks scanning in group scope (PersonalOnlyNotice, no scanner)", () => {
    setScope({ kind: "group", id: "g1", name: "Casa" });
    render(<ScanPage />);
    expect(screen.queryByTestId("personal-only-notice")).not.toBeNull();
    expect(screen.queryByText("Scan Receipt")).toBeNull();
  });

  it("shows the scanner in personal scope", () => {
    setScope({ kind: "personal" });
    render(<ScanPage />);
    expect(screen.queryByTestId("personal-only-notice")).toBeNull();
    expect(screen.queryByText("Scan Receipt")).not.toBeNull();
  });
});
