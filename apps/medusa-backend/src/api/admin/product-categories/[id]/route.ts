import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  getStoreCoreService,
  normalizeCategory,
  parseOptionalNumber,
  requireText,
  sendError
} from "../../../_helpers/store-core"

type UpdateCategoryBody = {
  name?: string
  description?: string
  parent_id?: string | null
  sort_order?: number
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

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const categoryId = req.params.id
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const categories = await storeCoreService.listProductCategories({
    id: categoryId,
    store_id: storeId,
  })

  if (!categories.length) {
    return sendError(res, 404, "NOT_FOUND", "Category not found")
  }

  const children = await storeCoreService.listProductCategories({
    parent_id: categoryId,
    store_id: storeId,
  })

  const products = await storeCoreService.listProducts({ store_id: storeId })
  const productsUsingCategory = products.filter(
    (p: any) => Array.isArray(p.category_ids) && p.category_ids.includes(categoryId)
  )

  return res.json({
    category: normalizeCategory(categories[0]),
    children: children.map(normalizeCategory),
    product_count: productsUsingCategory.length,
  })
}

export const PUT = async (
  req: MedusaRequest<UpdateCategoryBody>,
  res: MedusaResponse
) => {
  const categoryId = req.params.id
  const body = req.body ?? {}
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const categories = await storeCoreService.listProductCategories({
    id: categoryId,
    store_id: storeId,
  })

  if (!categories.length) {
    return sendError(res, 404, "NOT_FOUND", "Category not found")
  }

  const existing = categories[0]
  const updateData: Record<string, unknown> = {}

  const newName = requireText(body.name)
  if (newName && newName !== existing.name) {
    const slug = slugifyCategoryName(newName)
    const duplicate = await storeCoreService.listProductCategories({
      store_id: storeId,
      slug,
    })
    if (duplicate.length && duplicate[0].id !== categoryId) {
      return sendError(res, 400, "VALIDATION_ERROR", "Category name already exists")
    }
    updateData.name = newName
    updateData.slug = slug
  }

  if (body.description !== undefined) {
    updateData.description = body.description ?? null
  }

  if (body.parent_id !== undefined) {
    if (body.parent_id === categoryId) {
      return sendError(res, 400, "VALIDATION_ERROR", "Category cannot be its own parent")
    }
    if (body.parent_id) {
      const parentCategories = await storeCoreService.listProductCategories({
        id: body.parent_id,
        store_id: storeId,
      })
      if (!parentCategories.length) {
        return sendError(res, 400, "VALIDATION_ERROR", "parent_id must belong to current store")
      }
      updateData.parent_id = body.parent_id
      updateData.level = (parentCategories[0].level ?? 1) + 1
    } else {
      updateData.parent_id = null
      updateData.level = 1
    }
  }

  const sortOrder = parseOptionalNumber(body.sort_order)
  if (sortOrder !== null && sortOrder !== undefined) {
    updateData.sort_order = sortOrder
  }

  if (Object.keys(updateData).length === 0) {
    return sendError(res, 400, "VALIDATION_ERROR", "No fields to update")
  }

  await storeCoreService.updateProductCategories(categoryId, updateData)

  const updated = await storeCoreService.listProductCategories({
    id: categoryId,
    store_id: storeId,
  })

  return res.json({ category: normalizeCategory(updated[0]) })
}

export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const categoryId = req.params.id
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
