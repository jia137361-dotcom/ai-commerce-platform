import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { PLATFORM_STATUS_DISABLED } from "./require-platform-operator"

type UserModule = {
  retrieveUser: (id: string) => Promise<{ id: string; metadata?: Record<string, unknown> | null }>
  updateUsers: (data: unknown) => Promise<unknown>
}

type CustomerModule = {
  retrieveCustomer: (id: string) => Promise<{ id: string; metadata?: Record<string, unknown> | null }>
  updateCustomers: (id: string, data: { metadata?: Record<string, unknown> }) => Promise<unknown>
}

export async function setUserPlatformStatus(
  scope: MedusaContainer,
  userId: string,
  status: typeof PLATFORM_STATUS_DISABLED | "active"
) {
  const userModule = scope.resolve(Modules.USER) as UserModule
  const user = await userModule.retrieveUser(userId)
  const metadata = { ...(user.metadata ?? {}), platform_status: status }
  await userModule.updateUsers({ id: userId, metadata })
}

export async function setCustomerPlatformStatus(
  scope: MedusaContainer,
  customerId: string,
  status: typeof PLATFORM_STATUS_DISABLED | "active"
) {
  const customerModule = scope.resolve(Modules.CUSTOMER) as CustomerModule
  const customer = await customerModule.retrieveCustomer(customerId)
  const metadata = { ...(customer.metadata ?? {}), platform_status: status }
  await customerModule.updateCustomers(customerId, { metadata })
}
