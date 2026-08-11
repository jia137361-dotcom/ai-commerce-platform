import type { BuyerCategory } from "../../lib/buyer-api"
import type { StoreProduct } from "../../lib/mock-data"

export const collectCategoryTreeIds = (categories: BuyerCategory[], categoryId: string) => {
  const ids = new Set([categoryId])
  let changed = true
  while (changed) {
    changed = false
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id)
        changed = true
      }
    }
  }
  return ids
}

export const productMatchesCategory = (
  product: StoreProduct,
  categories: BuyerCategory[],
  categoryId: string
) => categoryId === "all" || product.categoryIds?.some((id) => collectCategoryTreeIds(categories, categoryId).has(id)) === true
