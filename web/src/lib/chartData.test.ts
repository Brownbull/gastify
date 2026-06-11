import { describe, it, expect } from "vitest";
import {
  flattenTreeAtLevel,
  rollupToSlices,
  treeNodesToSlices,
  parsePercent,
  categoryColorVar,
  OTHER_KEY,
} from "./chartData";
import type { components } from "@/lib/api-types";

type CategoryRollup = components["schemas"]["InsightCategoryRollup"];
type TreeNode = components["schemas"]["InsightsTreeNode"];

function rollup(overrides: Partial<CategoryRollup>): CategoryRollup {
  return {
    dimension: "transaction_category",
    category_key: "Supermarket",
    category_level: 2,
    parent_key: "Retail",
    parent_level: 1,
    label: "Supermarket",
    parent_label: "Retail",
    total_minor: 100_000,
    currency: "CLP",
    share_of_total_percent: "50.00",
    transaction_count: 3,
    item_count: 8,
    excluded_total_minor: 0,
    excluded_item_count: 0,
    ...overrides,
  };
}

describe("parsePercent", () => {
  it("parses a Decimal-string percent", () => {
    expect(parsePercent("65.10")).toBeCloseTo(65.1);
  });

  it("clamps out-of-range and non-numeric values", () => {
    expect(parsePercent("150")).toBe(100);
    expect(parsePercent("-3")).toBe(0);
    expect(parsePercent("not-a-number")).toBe(0);
  });
});

describe("categoryColorVar", () => {
  it("is stable per category key (same key -> same token)", () => {
    expect(categoryColorVar("Supermarket")).toBe(categoryColorVar("Supermarket"));
  });

  it("returns a CSS var referencing a chart token", () => {
    expect(categoryColorVar("Restaurant")).toMatch(/^var\(--chart-[1-6]\)$/);
  });

  it("maps the Other key to the neutral token", () => {
    expect(categoryColorVar(OTHER_KEY)).toBe("var(--neutral-primary)");
  });
});

describe("rollupToSlices", () => {
  it("synthesizes an Other slice for the capped remainder so slices sum to total", () => {
    const rows = [
      rollup({ category_key: "Supermarket", total_minor: 60_000, share_of_total_percent: "60.00" }),
      rollup({ category_key: "Restaurant", total_minor: 30_000, share_of_total_percent: "30.00" }),
    ];
    const slices = rollupToSlices(rows, 100_000);

    expect(slices).toHaveLength(3);
    const other = slices.at(-1)!;
    expect(other.isOther).toBe(true);
    expect(other.categoryKey).toBe(OTHER_KEY);
    expect(other.valueMinor).toBe(10_000);
    expect(slices.reduce((sum, s) => sum + s.valueMinor, 0)).toBe(100_000);
  });

  it("omits the Other slice when rows already account for the total", () => {
    const rows = [
      rollup({ category_key: "Supermarket", total_minor: 100_000, share_of_total_percent: "100.00" }),
    ];
    const slices = rollupToSlices(rows, 100_000);

    expect(slices).toHaveLength(1);
    expect(slices.some((s) => s.isOther)).toBe(false);
  });

  it("parses the string percent into a number", () => {
    const slices = rollupToSlices(
      [rollup({ share_of_total_percent: "42.50", total_minor: 42_500 })],
      100_000,
    );
    expect(slices[0].percent).toBeCloseTo(42.5);
  });

  it("returns no slices for an empty / zero-spend month", () => {
    expect(rollupToSlices([], 0)).toHaveLength(0);
  });
});

describe("treeNodesToSlices", () => {
  function treeNode(overrides: Partial<TreeNode>): TreeNode {
    return {
      key: "FreshFood",
      label: "Fresh Food",
      parent_key: "Supermarket",
      level: 3,
      total_minor: 90_000,
      currency: "CLP",
      share_of_total_percent: "32.55",
      transaction_count: 2,
      item_count: 2,
      excluded_total_minor: 0,
      children: [],
      ...overrides,
    };
  }

  it("computes percentages within the parent, not the grand total", () => {
    const slices = treeNodesToSlices(
      [
        treeNode({ key: "MeatSeafood", label: "Meat & Seafood", total_minor: 60_000 }),
        treeNode({ key: "Produce", label: "Produce", total_minor: 30_000 }),
      ],
      90_000, // parent total, NOT the month total
    );
    expect(slices.map((s) => s.label)).toEqual(["Meat & Seafood", "Produce"]);
    expect(slices[0].percent).toBeCloseTo(66.67);
    expect(slices[1].percent).toBeCloseTo(33.33);
  });

  it("marks nodes drillable only when they have children", () => {
    const slices = treeNodesToSlices(
      [
        treeNode({ key: "FreshFood", children: [treeNode({ key: "Produce" })] }),
        treeNode({ key: "Snacks", label: "Snacks", children: [] }),
      ],
      180_000,
    );
    expect(slices.find((s) => s.categoryKey === "FreshFood")?.drillable).toBe(true);
    expect(slices.find((s) => s.categoryKey === "Snacks")?.drillable).toBe(false);
  });

  it("synthesizes a non-drillable Other remainder when children miss the parent total", () => {
    const slices = treeNodesToSlices([treeNode({ total_minor: 60_000 })], 100_000);
    const other = slices.find((s) => s.categoryKey === OTHER_KEY);
    expect(other?.isOther).toBe(true);
    expect(other?.drillable).toBe(false);
    expect(other?.valueMinor).toBe(40_000);
  });

  it("adds no Other slice when children reconcile to the parent total", () => {
    const slices = treeNodesToSlices([treeNode({ total_minor: 100_000 })], 100_000);
    expect(slices.some((s) => s.isOther)).toBe(false);
  });
});


describe("flattenTreeAtLevel", () => {
  const node = (key: string, level: number, total: number, children: unknown[] = []) =>
    ({ key, label: key, level, total_minor: total, children }) as never;

  it("merges same-key nodes across parents at the cut level (summing spend)", () => {
    const roots = [
      node("ind-a", 1, 600, [node("st-1", 2, 600, [node("OtherFamily", 3, 100)])]),
      node("ind-b", 1, 400, [node("st-2", 2, 400, [node("OtherFamily", 3, 50)])]),
    ];
    const slices = flattenTreeAtLevel(roots, 3, 1000);
    expect(slices).toHaveLength(1); // ONE merged slice, not duplicate keys
    expect(slices[0].categoryKey).toBe("OtherFamily");
    expect(slices[0].valueMinor).toBe(150);
  });

  it("cuts at exactly the requested level", () => {
    const roots = [node("ind-a", 1, 600, [node("st-1", 2, 600)])];
    expect(flattenTreeAtLevel(roots, 1, 600).map((s) => s.categoryKey)).toEqual(["ind-a"]);
    expect(flattenTreeAtLevel(roots, 2, 600).map((s) => s.categoryKey)).toEqual(["st-1"]);
  });
});
