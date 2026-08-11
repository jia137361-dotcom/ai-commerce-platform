import type { ExecArgs } from "./medusa-exec-args"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

const DEFAULT_OPERATOR_EMAIL =
  process.env.PLATFORM_OPS_OPERATOR_EMAIL || "1355026750@qq.com"

export default async function platformOpsBootstrap({ container }: ExecArgs) {
  const userModule = container.resolve(Modules.USER) as {
    listUsers: (filters: { email: string }) => Promise<Array<{ id: string; email?: string }>>
  }
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const users = await userModule.listUsers({ email: DEFAULT_OPERATOR_EMAIL })
  const user = users[0]
  if (!user?.id) {
    throw new Error(
      `No Medusa user found for ${DEFAULT_OPERATOR_EMAIL}. Create the user first, then re-run platform-ops-bootstrap.`
    )
  }

  const existing = await storeCore.listPlatformOperators({ user_id: user.id })
  if (existing.length) {
    console.log(`Platform operator already exists for ${DEFAULT_OPERATOR_EMAIL} (${existing[0].id})`)
    return
  }

  const operator = await storeCore.createPlatformOperators({
    user_id: user.id,
    role: "admin",
    status: "active",
  })

  console.log(`Created platform operator ${operator.id} for ${DEFAULT_OPERATOR_EMAIL} (user ${user.id})`)
}
