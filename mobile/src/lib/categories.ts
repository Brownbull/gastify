import { apiClient } from "./api";
import { readApiError } from "./apiError";
import type { components } from "./api-types";

export type StoreCategoryItem = components["schemas"]["StoreCategoryItem"];
export type ItemCategoryItem = components["schemas"]["ItemCategoryItem"];
export type CategoryItem = StoreCategoryItem | ItemCategoryItem;

export async function listStoreCategories(): Promise<StoreCategoryItem[]> {
  const { data, error } = await apiClient.GET(
    "/api/v1/reference/store-categories",
  );

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to fetch store categories"));
  }

  return data;
}

export async function listItemCategories(): Promise<ItemCategoryItem[]> {
  const { data, error } = await apiClient.GET(
    "/api/v1/reference/item-categories",
  );

  if (error || !data) {
    throw new Error(readApiError(error, "Failed to fetch item categories"));
  }

  return data;
}

export function categoryLabel(category: CategoryItem | undefined): string {
  if (!category) return "Uncategorized";
  const label = category.display_labels.en;
  return typeof label === "string" ? label : category.key;
}

export function categoryPath(
  categories: readonly CategoryItem[] | undefined,
  categoryId: string | null | undefined,
): string {
  if (!categories || !categoryId) return "Uncategorized";

  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(categoryId);

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(categoryLabel(current));
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }

  return path.length > 0 ? path.join(" / ") : "Uncategorized";
}
