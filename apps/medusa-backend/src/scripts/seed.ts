import { ExecArgs } from "@medusajs/framework/types"
import { STORE_CORE_MODULE } from "../modules/store-core"
import StoreCoreModuleService from "../modules/store-core/service"
import { DEFAULT_STORE_ID } from "../lib/store-context"

export default async function seedStoreCore({ container }: ExecArgs) {
  const storeCoreService = container.resolve<StoreCoreModuleService>(STORE_CORE_MODULE)

  const existingStores = await storeCoreService.listStores({
    id: [DEFAULT_STORE_ID, "test_store"]
  })

  const existingIds = new Set(existingStores.map((store) => store.id))

  if (!existingIds.has(DEFAULT_STORE_ID)) {
    await storeCoreService.createStores({
      id: DEFAULT_STORE_ID,
      name: "Default Store",
      slug: "default-store",
      status: "active"
    })
  }

  if (!existingIds.has("test_store")) {
    await storeCoreService.createStores({
      id: "test_store",
      name: "Test Store",
      slug: "test-store",
      status: "active"
    })
  }
}

