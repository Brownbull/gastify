import {
  rollupToSlices,
  parsePercent,
  colorIndexForKey,
  OTHER_KEY,
  SERIES_PALETTE_SIZE,
} from "../chartData";
import type { InsightCategoryRollup } from "../insights";

function rollup(overrides: Partial<InsightCategoryRollup>): InsightCategoryRollup {
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
  it("parses a Decimal-string percent and clamps", () => {
    expect(parsePercent("65.10")).toBeCloseTo(65.1);
    expect(parsePercent("150")).toBe(100);
    expect(parsePercent("nope")).toBe(0);
  });
});

describe("colorIndexForKey", () => {
  it("is stable and within the palette range", () => {
    const idx = colorIndexForKey("Supermarket");
    expect(idx).toBe(colorIndexForKey("Supermarket"));
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(SERIES_PALETTE_SIZE);
  });
});

describe("rollupToSlices", () => {
  it("synthesizes an Other slice so slices sum to the total", () => {
    const slices = rollupToSlices(
      [
        rollup({ category_key: "Supermarket", total_minor: 60_000 }),
        rollup({ category_key: "Restaurant", total_minor: 30_000 }),
      ],
      100_000,
    );

    expect(slices).toHaveLength(3);
    const other = slices.at(-1)!;
    expect(other.categoryKey).toBe(OTHER_KEY);
    expect(other.isOther).toBe(true);
    expect(other.valueMinor).toBe(10_000);
    expect(slices.reduce((sum, s) => sum + s.valueMinor, 0)).toBe(100_000);
  });

  it("omits Other when rows account for the full total", () => {
    const slices = rollupToSlices([rollup({ total_minor: 100_000 })], 100_000);
    expect(slices).toHaveLength(1);
    expect(slices.some((s) => s.isOther)).toBe(false);
  });

  it("returns nothing for a zero-spend month", () => {
    expect(rollupToSlices([], 0)).toHaveLength(0);
  });
});
