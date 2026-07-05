import type { ExecArgs } from "@medusajs/framework/types"
import {
  SHIP_TO_REGION_SEEDS,
  WAREHOUSE_REGION_SEEDS,
} from "../lib/logistics-regions-data"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

type StoreCoreWithLogistics = StoreCoreModuleService & {
  listWarehouseRegions: (filters: Record<string, unknown>) => Promise<Array<{ id: string }>>
  createWarehouseRegions: (data: unknown) => Promise<unknown>
  updateWarehouseRegions: (input: Record<string, unknown>) => Promise<unknown>
  listShipToRegions: (filters: Record<string, unknown>) => Promise<Array<{ id: string }>>
  createShipToRegions: (data: unknown) => Promise<unknown>
  updateShipToRegions: (input: Record<string, unknown>) => Promise<unknown>
}

const upsertMany = async <T extends { id: string }>(
  items: T[],
  list: (filters: Record<string, unknown>) => Promise<Array<{ id: string }>>,
  create: (data: T[]) => Promise<unknown>,
  update: (id: string, data: T) => Promise<unknown>
) => {
  const existing = await list({ id: items.map((item) => item.id) })
  const existingIds = new Set(existing.map((item) => item.id))
  const missing = items.filter((item) => !existingIds.has(item.id))
  const present = items.filter((item) => existingIds.has(item.id))

  if (missing.length) {
    await create(missing)
  }

  for (const item of present) {
    await update(item.id, item)
  }

  return { created: missing.length, updated: present.length }
}

export default async function bootstrapLogisticsRegions({ container }: ExecArgs) {
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreWithLogistics

  const warehouse = await upsertMany(
    WAREHOUSE_REGION_SEEDS,
    (filters) => storeCore.listWarehouseRegions(filters),
    (items) => storeCore.createWarehouseRegions(items),
    (id, item) => storeCore.updateWarehouseRegions({ selector: { id }, data: item })
  )
  const shipTo = await upsertMany(
    SHIP_TO_REGION_SEEDS,
    (filters) => storeCore.listShipToRegions(filters),
    (items) => storeCore.createShipToRegions(items),
    (id, item) => storeCore.updateShipToRegions({ selector: { id }, data: item })
  )

  console.log(
    `LOGISTICS_WAREHOUSE_REGIONS created=${warehouse.created} updated=${warehouse.updated} total=${WAREHOUSE_REGION_SEEDS.length}`
  )
  console.log(
    `LOGISTICS_SHIP_TO_REGIONS created=${shipTo.created} updated=${shipTo.updated} total=${SHIP_TO_REGION_SEEDS.length}`
  )
}
