export type StoreMessageRecord = {
  id?: string
  store_id?: string
  customer_id?: string
  customer_email?: string
  customer_name?: string | null
  order_id?: string | null
  sender_role?: "buyer" | "seller"
  body?: string
  read_by_buyer_at?: string | Date | null
  read_by_seller_at?: string | Date | null
  created_at?: string | Date
  updated_at?: string | Date
}

export type StoreMessageThreadSummary = {
  customer_id: string
  customer_email: string
  customer_name: string | null
  last_message_at: string | null
  last_message_preview: string | null
  unread_for_seller: number
}

const readDate = (value: unknown) => {
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  return null
}

export const normalizeStoreMessage = (message: StoreMessageRecord) => ({
  message_id: message.id,
  store_id: message.store_id,
  customer_id: message.customer_id,
  customer_email: message.customer_email,
  customer_name: message.customer_name ?? null,
  order_id: message.order_id ?? null,
  sender_role: message.sender_role,
  body: message.body ?? "",
  read_by_buyer_at: readDate(message.read_by_buyer_at),
  read_by_seller_at: readDate(message.read_by_seller_at),
  created_at: readDate(message.created_at),
})

export const summarizeSellerMessageThreads = (
  messages: StoreMessageRecord[]
): StoreMessageThreadSummary[] => {
  const threads = new Map<string, StoreMessageThreadSummary>()

  for (const message of messages) {
    const customerId = message.customer_id
    if (!customerId) continue

    const createdAt = readDate(message.created_at)
    const existing = threads.get(customerId)
    const unreadForSeller =
      message.sender_role === "buyer" && !message.read_by_seller_at ? 1 : 0

    if (!existing) {
      threads.set(customerId, {
        customer_id: customerId,
        customer_email: message.customer_email ?? "",
        customer_name: message.customer_name ?? null,
        last_message_at: createdAt,
        last_message_preview: message.body ?? null,
        unread_for_seller: unreadForSeller,
      })
      continue
    }

    existing.unread_for_seller += unreadForSeller
    if (
      createdAt &&
      (!existing.last_message_at || createdAt > existing.last_message_at)
    ) {
      existing.last_message_at = createdAt
      existing.last_message_preview = message.body ?? null
    }
  }

  return [...threads.values()].sort((left, right) =>
    (right.last_message_at ?? "").localeCompare(left.last_message_at ?? "")
  )
}

export const parseMessageBody = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.length <= 2000 ? trimmed : undefined
}
