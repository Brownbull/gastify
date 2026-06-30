import { describe, it, expect } from "vitest";
import { kebabCase, itemCategoryIcon, storeCategoryIcon } from "./categoryIcon";

describe("categoryIcon", () => {
  it("kebabCase converts PascalCase taxonomy keys", () => {
    expect(kebabCase("BreadPastry")).toBe("bread-pastry");
    expect(kebabCase("DairyEggs")).toBe("dairy-eggs");
    expect(kebabCase("Produce")).toBe("produce");
  });

  it("itemCategoryIcon resolves known item keys and falls back to item-other", () => {
    expect(itemCategoryIcon("BreadPastry")).toBe("item-bread-pastry");
    expect(itemCategoryIcon("Produce")).toBe("item-produce");
    expect(itemCategoryIcon("DairyEggs")).toBe("item-dairy-eggs");
    expect(itemCategoryIcon("SomethingUnmapped")).toBe("item-other");
    expect(itemCategoryIcon(undefined)).toBe("item-other");
  });

  it("storeCategoryIcon maps English industry to its Spanish rubro and falls back to rubro-otros", () => {
    expect(storeCategoryIcon("Supermarkets")).toBe("rubro-supermercados");
    expect(storeCategoryIcon("Restaurants")).toBe("rubro-restaurantes");
    expect(storeCategoryIcon("supermercados")).toBe("rubro-supermercados"); // already a Spanish slug
    expect(storeCategoryIcon("SomeL2BusinessType")).toBe("rubro-otros");
    expect(storeCategoryIcon(undefined)).toBe("rubro-otros");
  });
});
