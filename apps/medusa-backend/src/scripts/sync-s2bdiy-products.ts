/**
 * Batch sync S2BDIY basic products into mc_supplier_product (+ variants, print specs).
 *
 * Usage (must run inside apps/medusa-backend):
 *   npx medusa exec ./src/scripts/sync-s2bdiy-products.ts
 *
 * From monorepo root:
 *   npm --workspace apps/medusa-backend exec -- npx medusa exec ./src/scripts/sync-s2bdiy-products.ts
 *
 * Env:
 *   DEFAULT_STORE_ID=default_store
 *   S2BDIY_SYNC_PER_PAGE=50
 *   S2BDIY_SYNC_START_PAGE=1
 *   S2BDIY_SYNC_MAX_PAGES=0        (0 = all pages)
 *   S2BDIY_SYNC_PRODUCT_IDS=1672,1234  (optional, sync specific IDs only)
 */

import type { ExecArgs } from "./medusa-exec-args"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { requireSupplierAdapter } from "../modules/suppliers/registry"
import { ensureSupplierProductDraft, syncBasicProduct } from "../modules/suppliers/services/supplier-sync-service"
import { getS2bdiyConfig, isS2bdiyMockMode } from "../modules/suppliers/s2bdiy/config"

const SUPPLIER_ID = "sup_s2bdiy"

const readInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const readProductIds = () => {
  const raw = process.env.S2BDIY_SYNC_PRODUCT_IDS?.trim()
  if (!raw) return null
  const ids = raw
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id) && id > 0)
  return ids.length ? ids : null
}

export default async function syncS2bdiyProducts({ container }: ExecArgs) {
  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const storeId = process.env.DEFAULT_STORE_ID?.trim() || "default_store"
  const perPage = Math.min(Math.max(readInt(process.env.S2BDIY_SYNC_PER_PAGE, 50), 1), 100)
  const startPage = Math.max(readInt(process.env.S2BDIY_SYNC_START_PAGE, 1), 1)
  const maxPages = Math.max(readInt(process.env.S2BDIY_SYNC_MAX_PAGES, 0), 0)
  const explicitIds = readProductIds()

  if (isS2bdiyMockMode() || !getS2bdiyConfig()) {
    throw new Error(
      "S2BDIY is in mock mode or not configured. Set S2BDIY_MOCK_MODE=false and real API credentials in apps/medusa-backend/.env"
    )
  }

  const stores = await storeCoreService.listStores({ id: storeId })
  if (!stores.length) {
    throw new Error(`Store not found: ${storeId}`)
  }

  const suppliers = await storeCoreService.listSuppliers({ id: SUPPLIER_ID })
  if (!suppliers.length) {
    throw new Error(`Supplier ${SUPPLIER_ID} not found. Run seed or scripts/insert-suppliers.js first.`)
  }

  const adapter = requireSupplierAdapter(SUPPLIER_ID)
  const context = { storeCoreService, storeId }

  console.log("==========================================")
  console.log("S2BDIY basic product sync")
  console.log(`Store: ${storeId}`)
  console.log("==========================================")

  let synced = 0
  let failed = 0

  if (explicitIds) {
    console.log(`Syncing ${explicitIds.length} explicit product id(s)...`)
    for (const productId of explicitIds) {
      try {
        const result = await syncBasicProduct(productId, SUPPLIER_ID, context)
        synced++
        console.log(
          `  OK ${productId} → ${result.supplier_product_id} (${result.variant_count} variants, ${result.view_count} views)`
        )
      } catch (error) {
        failed++
        const message = error instanceof Error ? error.message : String(error)
        console.log(`  FAIL ${productId}: ${message}`)
      }
    }
  } else {
    let page = startPage
    let lastPage = startPage

    do {
      const catalog = await adapter.listProducts({ page, perPage })
      const rows = Array.isArray(catalog.data) ? catalog.data : []
      lastPage = catalog.last_page ?? page
      console.log(`Page ${page}/${lastPage}: ${rows.length} products`)

      for (const row of rows) {
        const productId = Number((row as { id?: unknown }).id)
        if (!Number.isFinite(productId) || productId <= 0) continue
        try {
          const result = await syncBasicProduct(productId, SUPPLIER_ID, context)
          await ensureSupplierProductDraft(storeCoreService, storeId, result.supplier_product_id)
          synced++
          if (synced <= 5 || synced % 50 === 0) {
            console.log(
              `  OK ${productId} → ${result.supplier_product_id} (${result.variant_count} variants)`
            )
          }
        } catch (error) {
          failed++
          const message = error instanceof Error ? error.message : String(error)
          console.log(`  FAIL ${productId}: ${message}`)
        }
      }

      page++
      if (maxPages > 0 && page >= startPage + maxPages) break
    } while (page <= lastPage)
  }

  console.log("==========================================")
  console.log(`Done. Synced: ${synced}, Failed: ${failed}`)
  console.log("==========================================")
}
