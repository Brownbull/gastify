import { beforeEach, describe, expect, it } from "vitest";
import {
  useBatchScanStore,
  derivePhase,
  isTerminalStatus,
  type BatchScanItem,
} from "./batchScanStore";

const SEEDS = [
  { localId: "a", fileName: "a.jpg", previewUrl: null },
  { localId: "b", fileName: "b.jpg", previewUrl: null },
];

function statusesOf(items: readonly BatchScanItem[]): string[] {
  return items.map((i) => i.status);
}

describe("batchScanStore", () => {
  beforeEach(() => {
    useBatchScanStore.getState().reset();
  });

  it("starts idle with no items", () => {
    const state = useBatchScanStore.getState();
    expect(state.phase).toBe("idle");
    expect(state.items).toHaveLength(0);
  });

  it("seeds items as uploading and enters processing phase", () => {
    useBatchScanStore.getState().start(SEEDS);
    const state = useBatchScanStore.getState();
    expect(state.phase).toBe("processing");
    expect(statusesOf(state.items)).toEqual(["uploading", "uploading"]);
    expect(state.items[0]).toMatchObject({
      localId: "a",
      fileName: "a.jpg",
      scanId: null,
      transactionId: null,
      progressPct: 0,
    });
  });

  it("patchItem updates only the targeted item immutably", () => {
    useBatchScanStore.getState().start(SEEDS);
    const before = useBatchScanStore.getState().items;
    useBatchScanStore
      .getState()
      .patchItem("a", { scanId: "scan-a", status: "processing", progressPct: 15 });
    const after = useBatchScanStore.getState().items;

    expect(after[0]).toMatchObject({ scanId: "scan-a", progressPct: 15 });
    expect(after[1]).toBe(before[1]); // untouched item keeps identity
    expect(after).not.toBe(before); // new array
  });

  it("moves to review only when every item is terminal", () => {
    useBatchScanStore.getState().start(SEEDS);
    useBatchScanStore
      .getState()
      .patchItem("a", { status: "completed", transactionId: "t1" });
    expect(useBatchScanStore.getState().phase).toBe("processing");

    useBatchScanStore.getState().patchItem("b", { status: "failed" });
    expect(useBatchScanStore.getState().phase).toBe("review");
  });

  it("reset returns to the initial state", () => {
    useBatchScanStore.getState().start(SEEDS);
    useBatchScanStore.getState().reset();
    expect(useBatchScanStore.getState().phase).toBe("idle");
    expect(useBatchScanStore.getState().items).toHaveLength(0);
  });

  it("derivePhase + isTerminalStatus classify statuses", () => {
    expect(derivePhase([])).toBe("idle");
    expect(isTerminalStatus("processing")).toBe(false);
    expect(isTerminalStatus("uploading")).toBe(false);
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("needs_review")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
    expect(isTerminalStatus("discarded")).toBe(true);
  });
});
