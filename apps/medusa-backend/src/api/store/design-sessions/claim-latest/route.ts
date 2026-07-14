/**
 * Claim the newest S2B designed product for a blank template into My Design.
 * Used when the Studio iframe does not postMessage a product_id (common).
 *
 * POST /store/design-sessions/claim-latest
 *
 * Body:
 * - basic_product_id (required)
 * - blank_product_id, guest_key, exclude_s2b_ids[], save_as
 * - snapshot_only: if true, only return matching S2B ids (no claim)
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { getStoreCoreService, sendError } from "../../../_helpers/store-core"
import {
  completeBuyerDesignSession,
  findLatestDesignedProductId,
} from "../../../../lib/s2bdiy/complete-buyer-design"
import { getS2bdiyConfig } from "../../../../modules/suppliers/s2bdiy/config"
import { listDesignedProducts } from "../../../../modules/suppliers/s2bdiy/s2bdiy-product"
import { S2bdiyClient } from "../../../../modules/suppliers/s2bdiy/s2bdiy-client"
import { readString } from "../../../../lib/product-cart-bridge"

function resolveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

async function listMatchingS2bIds(basicProductId: string): Promise<string[]> {
  const s2bConfig = getS2bdiyConfig()
  if (!s2bConfig) throw new Error("Design service is not configured")
  const client = new S2bdiyClient(s2bConfig)
  const rows = await listDesignedProducts(client, { page: 1, perPage: 50 })
  return rows
    .map((row) => {
      const id = resolveNumber(row.id) ?? resolveNumber(row.product_id)
      const basic =
        resolveNumber(row.basic_product_id) ??
        resolveNumber((row.product_design as Record<string, unknown> | undefined)?.basic_product_id)
      return id && String(basic ?? "") === basicProductId ? String(id) : null
    })
    .filter((id): id is string => Boolean(id))
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const body = (req.body ?? {}) as {
    basic_product_id?: number | string
    blank_product_id?: string
    guest_key?: string
    exclude_s2b_ids?: Array<number | string>
    save_as?: "draft" | "ready"
    snapshot_only?: boolean
    mockup_url?: string
  }

  if (!body.basic_product_id) {
    return sendError(res, 400, "MISSING_FIELDS", "basic_product_id is required")
  }

  const basicProductId = String(body.basic_product_id)
  const excludeIds = Array.isArray(body.exclude_s2b_ids) ? body.exclude_s2b_ids : []
  const auth = req as MedusaRequest & { auth_context?: { actor_id?: string } }
  const customerId =
    typeof auth.auth_context?.actor_id === "string" ? auth.auth_context.actor_id : null
  const guestKey =
    typeof body.guest_key === "string" && body.guest_key.trim() ? body.guest_key.trim() : null
  const blankProductId =
    typeof body.blank_product_id === "string" && body.blank_product_id.trim()
      ? body.blank_product_id.trim()
      : null

  try {
    if (body.snapshot_only) {
      const knownIds = await listMatchingS2bIds(basicProductId)
      return res.status(200).json({ claimed: false, known_s2b_ids: knownIds })
    }

    // Also exclude S2B ids already imported as buyer designs in this store.
    const storeCore = getStoreCoreService(req)
    const existing = await storeCore.listProducts(
      {
        store_id: storeId,
        supplier_id: "sup_s2bdiy",
        basic_product_id: basicProductId,
      },
      { take: 100 }
    )
    const existingIds = (Array.isArray(existing) ? existing : [])
      .map((row: { supplier_product_id?: string; metadata?: Record<string, unknown> }) => {
        const fromField = readString(row.supplier_product_id)
        const fromMeta = readString(row.metadata?.s2b_product_id)
        return fromField || fromMeta
      })
      .filter(Boolean) as string[]

    const found = await findLatestDesignedProductId({
      basicProductId,
      excludeIds: [...excludeIds, ...existingIds],
    })

    if (!found) {
      const knownIds = await listMatchingS2bIds(basicProductId)
      return res.status(200).json({ claimed: false, known_s2b_ids: knownIds })
    }

    const result = await completeBuyerDesignSession(req.scope, {
      storeId,
      s2bProductId: found.s2bProductId,
      basicProductId,
      mockupUrl: body.mockup_url ?? found.mockupUrl,
      saveAs: body.save_as === "ready" ? "ready" : "draft",
      blankProductId,
      guestKey,
      customerId,
    })

    return res.status(201).json({
      claimed: true,
      known_s2b_ids: [found.s2bProductId, ...existingIds],
      ...result,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[design-sessions/claim-latest] failed:", message)
    if (message.includes("not configured")) {
      return sendError(res, 503, "EXTERNAL_SERVICE_ERROR", "Design service is not configured")
    }
    if (message.includes("Unable to resolve size/color")) {
      return sendError(res, 400, "VALIDATION_ERROR", message)
    }
    return sendError(res, 500, "EXTERNAL_SERVICE_ERROR", `Unable to claim design: ${message}`)
  }
}
