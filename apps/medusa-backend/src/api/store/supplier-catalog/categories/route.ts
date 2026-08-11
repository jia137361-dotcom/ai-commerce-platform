/**
 * Buyer storefront S2BDIY blank categories.
 *
 * GET /store/supplier-catalog/categories?supplier_id=sup_s2bdiy
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendError } from "../../../_helpers/store-core"
import { getS2bdiyConfig } from "../../../../modules/suppliers/s2bdiy/config"
import { getS2bdiyAccessToken } from "../../../../modules/suppliers/s2bdiy/s2bdiy-auth"
import { resolveCategoryEnglishLabel } from "../../../../lib/supplier-category-label"

const DEFAULT_SUPPLIER_ID = "sup_s2bdiy"

type RawCategory = {
  id?: number | string
  name?: string
  en_name?: string
  parent_id?: number | string | null
  children?: RawCategory[]
  [key: string]: unknown
}

function normalizeCategory(row: RawCategory): {
  id: number
  name: string
  en_name?: string
  parent_id: number | null
  children: Array<{ id: number; name: string; en_name?: string; parent_id: number | null }>
} | null {
  const id = Number(row.id)
  if (!Number.isFinite(id) || id <= 0) return null
  const parentRaw = row.parent_id == null ? null : Number(row.parent_id)
  const parentId = parentRaw && Number.isFinite(parentRaw) && parentRaw > 0 ? parentRaw : null
  const label = resolveCategoryEnglishLabel(row as Record<string, unknown>, id)
  const children = Array.isArray(row.children)
    ? row.children
        .map((child) => normalizeCategory(child))
        .filter((child): child is NonNullable<typeof child> => Boolean(child))
        .map((child) => ({
          id: child.id,
          name: child.name,
          en_name: child.en_name,
          parent_id: child.parent_id,
        }))
    : []

  return {
    id,
    name: label.name,
    en_name: label.en_name,
    parent_id: parentId,
    children,
  }
}

function flattenCategories(
  rows: Array<NonNullable<ReturnType<typeof normalizeCategory>>>
): Array<{ id: number; name: string; en_name?: string; parent_id: number | null }> {
  const out: Array<{ id: number; name: string; en_name?: string; parent_id: number | null }> = []
  const walk = (
    list: Array<NonNullable<ReturnType<typeof normalizeCategory>>>
  ) => {
    for (const row of list) {
      out.push({
        id: row.id,
        name: row.name,
        en_name: row.en_name,
        parent_id: row.parent_id,
      })
      if (row.children.length) {
        walk(
          row.children.map((child) => ({
            ...child,
            children: [],
          }))
        )
      }
    }
  }
  walk(rows)
  return out
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierId =
    (typeof req.query.supplier_id === "string" && req.query.supplier_id.trim()) ||
    DEFAULT_SUPPLIER_ID

  if (supplierId !== "sup_s2bdiy") {
    return sendError(res, 400, "VALIDATION_ERROR", `Unsupported supplier categories: ${supplierId}`)
  }

  const config = getS2bdiyConfig()
  if (!config) {
    return sendError(res, 503, "EXTERNAL_SERVICE_ERROR", "S2BDIY not configured")
  }

  try {
    const token = await getS2bdiyAccessToken(config)
    const baseUrl = config.apiBaseUrl.replace(/\/$/, "")
    const resp = await fetch(`${baseUrl}/open/v1/basicProduct/categorys`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) {
      return sendError(res, 502, "EXTERNAL_SERVICE_ERROR", `S2BDIY categories failed: ${resp.status}`)
    }
    const body = await resp.json()
    const rawList = (body?.data ?? body) as RawCategory[] | { data?: RawCategory[] }
    const rows = Array.isArray(rawList)
      ? rawList
      : Array.isArray((rawList as { data?: RawCategory[] }).data)
        ? ((rawList as { data: RawCategory[] }).data)
        : []

    const tree = rows
      .map((row) => normalizeCategory(row))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
    const flat = flattenCategories(tree)

    return res.json({
      supplier_id: supplierId,
      categories: flat,
      tree,
      count: flat.length,
    })
  } catch (error: unknown) {
    return sendError(
      res,
      502,
      "EXTERNAL_SERVICE_ERROR",
      `Supplier categories error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
