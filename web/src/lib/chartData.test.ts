import { describe, it, expect } from "vitest";
import {
  rollupToSlices,
  parsePercent,
  categoryColorVar,
  OTHER_KEY,
} from "./chartData";
import type { components } from "@/lib/api-types";

type CategoryRollup = components["schemas"]["InsightCategoryRollup"];

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
