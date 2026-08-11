import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import {
  getStoreCoreService,
  normalizeCategory,
  requireText,
  sendError
} from "../../_helpers/store-core"

type CreateProductCategoryBody = {
  name?: string
  description?: string
  parent_id?: string | null
}

const slugifyCategoryName = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
  return slug || `category-${Date.now()}`
}

export const POST = async (
  req: MedusaRequest<CreateProductCategoryBody>,
  res: MedusaResponse
) => {
  const body = req.body ?? {}
  const name = requireText(body.name)

  if (!name) {
    return sendError(res, 400, "VALIDATION_ERROR", "name is required")
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const stores = await storeCoreService.listStores({ id: storeId })

  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  const slug = slugifyCategoryName(name)

  const existingCategories = await storeCoreService.listProductCategories({
    store_id: storeId,
    slug
  })

  if (existingCategories.length) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "category name already exists in current store"
    )
  }

  let level = 1
  if (body.parent_id) {
    const parentCategories = await storeCoreService.listProductCategories({
      id: body.parent_id,
      store_id: storeId
    })

    if (!parentCategories.length) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "parent_id must belong to current store"
      )
    }
    level = (parentCategories[0].level ?? 1) + 1
  }

  const category = await storeCoreService.createProductCategories({
    store_id: storeId,
    name,
    slug,
    description: body.description ?? null,
    parent_id: body.parent_id ?? null,
    level
  })

  return res.status(201).json({
    category_id: category.id,
    store_id: category.store_id,
    category: normalizeCategory(category)
  })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const [categories, products] = await Promise.all([
    storeCoreService.listProductCategories(
      { store_id: storeId },
      { order: { sort_order: "ASC" } }
    ),
    storeCoreService.listProducts({ store_id: storeId }, { select: ["id", "category_ids"] }),
  ])

  const productCountByCategory = new Map<string, number>()
  for (const product of products as Array<{ category_ids?: unknown }>) {
    const ids = Array.isArray(product.category_ids) ? product.category_ids : []
    for (const categoryId of ids) {
      if (typeof categoryId !== "string" || !categoryId) continue
      productCountByCategory.set(categoryId, (productCountByCategory.get(categoryId) ?? 0) + 1)
    }
  }

  return res.json({
    store_id: storeId,
    count: categories.length,
    categories: categories.map((category: any) => ({
      ...normalizeCategory(category),
      product_count: productCountByCategory.get(category.id) ?? 0,
    })),
  })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const categoryId = req.query.category_id as string | undefined

  if (!categoryId) {
    return sendError(res, 400, "VALIDATION_ERROR", "category_id is required")
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const categories = await storeCoreService.listProductCategories({
    id: categoryId,
    store_id: storeId,
  })

  if (!categories.length) {
    return sendError(res, 404, "NOT_FOUND", "Category not found")
  }

  const products = await storeCoreService.listProducts({ store_id: storeId })
  const productsUsingCategory = products.filter(
    (p: any) => Array.isArray(p.category_ids) && p.category_ids.includes(categoryId)
  )

  if (productsUsingCategory.length > 0) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      `Cannot delete category: ${productsUsingCategory.length} product(s) still reference it`
    )
  }

  const children = await storeCoreService.listProductCategories({
    parent_id: categoryId,
    store_id: storeId,
  })

  if (children.length > 0) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      `Cannot delete category: ${children.length} subcategory(ies) exist under it`
    )
  }

  await storeCoreService.deleteProductCategories(categoryId)

  return res.json({ deleted: true, category_id: categoryId })
}
