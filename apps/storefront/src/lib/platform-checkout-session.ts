export type PlatformCheckoutSessionGroup = {
  store_id: string
  cart_id: string
  store_name: string
  platform_checkout_index: number
  platform_checkout_count: number
  subtotal?: number
  total?: number
  currency_code?: string
}

export type PlatformCheckoutSession = {
  platform_checkout_id: string
  groups: PlatformCheckoutSessionGroup[]
  completed_order_ids: string[]
  completed_store_ids: string[]
  grand_subtotal?: number
  grand_total?: number
  currency_code?: string
}

const SESSION_KEY = "citigoo:platform_checkout_session"

export const readPlatformCheckoutSession = (): PlatformCheckoutSession | null => {
  const raw = window.sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PlatformCheckoutSession
    return {
      ...parsed,
      completed_order_ids: parsed.completed_order_ids ?? [],
      completed_store_ids: parsed.completed_store_ids ?? [],
    }
  } catch {
    return null
  }
}

export const writePlatformCheckoutSession = (session: PlatformCheckoutSession) => {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export const clearPlatformCheckoutSession = () => {
  window.sessionStorage.removeItem(SESSION_KEY)
}

export const markPlatformCheckoutOrderComplete = (storeId: string, orderId: string) => {
  const session = readPlatformCheckoutSession()
  if (!session) return null
  const next: PlatformCheckoutSession = {
    ...session,
    completed_order_ids: session.completed_order_ids.includes(orderId)
      ? session.completed_order_ids
      : [...session.completed_order_ids, orderId],
    completed_store_ids: session.completed_store_ids.includes(storeId)
      ? session.completed_store_ids
      : [...session.completed_store_ids, storeId],
  }
  writePlatformCheckoutSession(next)
  return next
}

export const nextPendingPlatformCheckoutGroup = (session: PlatformCheckoutSession | null) => {
  if (!session) return null
  const completed = new Set(session.completed_store_ids)
  return session.groups.find((group) => !completed.has(group.store_id)) ?? null
}

export const isPlatformCheckoutComplete = (session: PlatformCheckoutSession | null) =>
  Boolean(session && session.completed_store_ids.length >= session.groups.length)
