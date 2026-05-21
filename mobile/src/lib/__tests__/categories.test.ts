import { categoryLabel, categoryPath } from "../categories";
import type { CategoryItem } from "../categories";

jest.mock("../api", () => ({
  apiClient: { GET: jest.fn() },
}));

function makeCategory(
  overrides: Partial<CategoryItem> & { id: string; key: string },
): CategoryItem {
  return {
    display_labels: { en: overrides.key.charAt(0).toUpperCase() + overrides.key.slice(1) },
    is_sensitive: false,
    level: 1,
    parent_id: null,
    sort_order: 0,
    ...overrides,
  } as CategoryItem;
}

describe("categoryLabel", () => {
  it("returns the English display label", () => {
    const category = makeCategory({ id: "c1", key: "supermarket" });
    expect(categoryLabel(category)).toBe("Supermarket");
  });

  it("falls back to the key when no English label", () => {
    const category = makeCategory({ id: "c1", key: "misc" });
    (category as Record<string, unknown>).display_labels = {};
    expect(categoryLabel(category)).toBe("misc");
  });

  it("returns Uncategorized for undefined", () => {
    expect(categoryLabel(undefined)).toBe("Uncategorized");
  });
});

describe("categoryPath", () => {
  it("returns Uncategorized for null category id", () => {
    const categories = [makeCategory({ id: "c1", key: "food" })];
    expect(categoryPath(categories, null)).toBe("Uncategorized");
  });

  it("returns Uncategorized for undefined categories list", () => {
    expect(categoryPath(undefined, "c1")).toBe("Uncategorized");
  });

  it("returns Uncategorized when id not found", () => {
    const categories = [makeCategory({ id: "c1", key: "food" })];
    expect(categoryPath(categories, "missing")).toBe("Uncategorized");
  });

  it("returns a single label for root-level categories", () => {
    const categories = [makeCategory({ id: "c1", key: "food" })];
    expect(categoryPath(categories, "c1")).toBe("Food");
  });

  it("builds a slash-separated path for nested categories", () => {
    const categories = [
      makeCategory({ id: "c1", key: "food" }),
      makeCategory({ id: "c2", key: "dairy", parent_id: "c1", level: 2 }),
      makeCategory({ id: "c3", key: "milk", parent_id: "c2", level: 3 }),
    ];
    expect(categoryPath(categories, "c3")).toBe("Food / Dairy / Milk");
  });

  it("handles cycles without infinite looping", () => {
    const categories = [
      makeCategory({ id: "c1", key: "alpha", parent_id: "c2" }),
      makeCategory({ id: "c2", key: "beta", parent_id: "c1" }),
    ];
    const result = categoryPath(categories, "c1");
    expect(result).toContain("Alpha");
    expect(result).toContain("Beta");
  });
});
