import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export type CustomerAddressRecord = {
  id: string
  customer_id: string
  address_name?: string | null
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

export type CustomerAddressInput = {
  address_name?: string
  first_name?: string
  last_name?: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code: string
  country_code: string
  phone?: string
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

type CustomerModuleService = {
  listCustomerAddresses: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<CustomerAddressRecord[]>
  createCustomerAddresses: (data: Record<string, unknown>) => Promise<CustomerAddressRecord>
  updateCustomerAddresses: (
    addressId: string,
    data: Record<string, unknown>
  ) => Promise<CustomerAddressRecord>
  deleteCustomerAddresses: (addressId: string) => Promise<void>
}

const getCustomerModule = (container: MedusaContainer) =>
  container.resolve(Modules.CUSTOMER) as unknown as CustomerModuleService

export const normalizeCustomerAddressResponse = (address: CustomerAddressRecord) => ({
  id: address.id,
  customer_id: address.customer_id,
  address_name: address.address_name ?? null,
  first_name: address.first_name ?? null,
  last_name: address.last_name ?? null,
  company: address.company ?? null,
  address_1: address.address_1 ?? null,
  address_2: address.address_2 ?? null,
  city: address.city ?? null,
  province: address.province ?? null,
  postal_code: address.postal_code ?? null,
  country_code: address.country_code?.toLowerCase() ?? null,
  phone: address.phone ?? null,
  is_default_shipping: Boolean(address.is_default_shipping),
  is_default_billing: Boolean(address.is_default_billing),
})

export const validateCustomerAddressInput = (body: Record<string, unknown>): CustomerAddressInput | string => {
  const address1 = typeof body.address_1 === "string" ? body.address_1.trim() : ""
  const city = typeof body.city === "string" ? body.city.trim() : ""
  const postalCode = typeof body.postal_code === "string" ? body.postal_code.trim() : ""
  const countryCode =
    typeof body.country_code === "string" ? body.country_code.trim().toLowerCase() : ""

  if (!address1 || !city || !postalCode || !countryCode) {
    return "address_1, city, postal_code, and country_code are required"
  }

  return {
    address_name: typeof body.address_name === "string" ? body.address_name.trim() : undefined,
    first_name: typeof body.first_name === "string" ? body.first_name.trim() : undefined,
    last_name: typeof body.last_name === "string" ? body.last_name.trim() : undefined,
    company: typeof body.company === "string" ? body.company.trim() : undefined,
    address_1: address1,
    address_2: typeof body.address_2 === "string" ? body.address_2.trim() : undefined,
    city,
    province: typeof body.province === "string" ? body.province.trim() : undefined,
    postal_code: postalCode,
    country_code: countryCode,
    phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
    is_default_shipping: body.is_default_shipping === true,
    is_default_billing: body.is_default_billing === true,
  }
}

const clearDefaultFlags = async (
  container: MedusaContainer,
  customerId: string,
  field: "is_default_shipping" | "is_default_billing",
  exceptId?: string
) => {
  const customerModule = getCustomerModule(container)
  const addresses = await customerModule.listCustomerAddresses({ customer_id: customerId })
  for (const address of addresses) {
    if (exceptId && address.id === exceptId) continue
    if (!address[field]) continue
    await customerModule.updateCustomerAddresses(address.id, {
      [field]: false,
    })
  }
}

export async function listCustomerAddressRecords(
  container: MedusaContainer,
  customerId: string,
  limit = 50
) {
  const customerModule = getCustomerModule(container)
  const addresses = await customerModule.listCustomerAddresses(
    { customer_id: customerId },
    { take: Math.min(Math.max(limit, 1), 100), order: { created_at: "DESC" } }
  )
  return addresses.map(normalizeCustomerAddressResponse)
}

export async function createCustomerAddressRecord(
  container: MedusaContainer,
  customerId: string,
  input: CustomerAddressInput
) {
  const customerModule = getCustomerModule(container)
  if (input.is_default_shipping) {
    await clearDefaultFlags(container, customerId, "is_default_shipping")
  }
  if (input.is_default_billing) {
    await clearDefaultFlags(container, customerId, "is_default_billing")
  }

  const created = await customerModule.createCustomerAddresses({
    customer_id: customerId,
    ...input,
  })

  return normalizeCustomerAddressResponse(created)
}

export async function updateCustomerAddressRecord(
  container: MedusaContainer,
  customerId: string,
  addressId: string,
  input: CustomerAddressInput
) {
  const customerModule = getCustomerModule(container)
  const existing = await customerModule.listCustomerAddresses({
    id: addressId,
    customer_id: customerId,
  })
  if (!existing.length) {
    throw new Error("Address not found")
  }

  if (input.is_default_shipping) {
    await clearDefaultFlags(container, customerId, "is_default_shipping", addressId)
  }
  if (input.is_default_billing) {
    await clearDefaultFlags(container, customerId, "is_default_billing", addressId)
  }

  const updated = await customerModule.updateCustomerAddresses(addressId, input)

  return normalizeCustomerAddressResponse(updated)
}

export async function deleteCustomerAddressRecord(
  container: MedusaContainer,
  customerId: string,
  addressId: string
) {
  const customerModule = getCustomerModule(container)
  const existing = await customerModule.listCustomerAddresses({
    id: addressId,
    customer_id: customerId,
  })
  if (!existing.length) {
    throw new Error("Address not found")
  }
  await customerModule.deleteCustomerAddresses(addressId)
}

export async function customerOwnsAddress(
  container: MedusaContainer,
  customerId: string,
  addressId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "customer_address",
    fields: ["id", "customer_id"],
    filters: { id: addressId, customer_id: customerId },
  })) as { data: Array<{ id?: string; customer_id?: string }> }
  return Boolean(data[0]?.id)
}
