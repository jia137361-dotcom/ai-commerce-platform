/**
 * Buyer-owned resources (My Designs, AI materials) — customer_id + guest_key isolation.
 */

export type BuyerResourceOwnerFields = {
  customer_id: string | null
  guest_key: string | null
}

const readOwnerString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null

export function readBuyerResourceOwner(
  ...records: Array<Record<string, unknown> | null | undefined>
): BuyerResourceOwnerFields {
  let customerId: string | null = null
  let guestKey: string | null = null

  for (const record of records) {
    if (!record) continue
    customerId = customerId ?? readOwnerString(record.customer_id)
    guestKey = guestKey ?? readOwnerString(record.guest_key)
  }

  return { customer_id: customerId, guest_key: guestKey }
}

/** Exclusive ownership: logged-out guests never see resources already claimed by a customer. */
export function buyerOwnsResource(
  owner: BuyerResourceOwnerFields,
  customerId: string | null,
  guestKey: string | null
) {
  const ownerCustomer = owner.customer_id
  const ownerGuest = owner.guest_key

  if (customerId) {
    if (ownerCustomer === customerId) return true
    return !ownerCustomer && Boolean(guestKey) && ownerGuest === guestKey
  }
  if (guestKey) {
    return !ownerCustomer && ownerGuest === guestKey
  }
  return false
}

export function buyerOwnsLegacyResource(
  owner: BuyerResourceOwnerFields,
  customerId: string | null,
  guestKey: string | null
) {
  if (!owner.customer_id && !owner.guest_key) {
    return true
  }
  return buyerOwnsResource(owner, customerId, guestKey)
}

export function buildBuyerResourceOwnerPayload(input: {
  customerId: string | null
  guestKey: string | null
}): BuyerResourceOwnerFields {
  if (input.customerId) {
    return { customer_id: input.customerId, guest_key: null }
  }
  return {
    customer_id: null,
    guest_key: input.guestKey?.trim() || null,
  }
}
