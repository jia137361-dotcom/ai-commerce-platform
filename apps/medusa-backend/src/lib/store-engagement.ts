type StoreSettingsRow = {
  id?: string
  store_id?: string
  metadata?: Record<string, unknown> | null
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()

export const readFollowerCount = (metadata: Record<string, unknown> | null | undefined) => {
  const count = metadata?.follower_count
  return typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : 0
}

export const readNewsletterSubscribers = (metadata: Record<string, unknown> | null | undefined) => {
  const raw = metadata?.newsletter_subscribers
  if (!Array.isArray(raw)) return [] as string[]
  return raw.filter((entry): entry is string => typeof entry === "string" && entry.includes("@"))
}

export const appendNewsletterSubscriber = (
  metadata: Record<string, unknown> | null | undefined,
  emailInput: string
) => {
  const email = normalizeEmail(emailInput)
  if (!email.includes("@")) {
    throw new Error("A valid email is required")
  }
  const existing = readNewsletterSubscribers(metadata)
  if (existing.includes(email)) {
    return { metadata: metadata ?? {}, created: false, email }
  }
  return {
    metadata: {
      ...(metadata ?? {}),
      newsletter_subscribers: [...existing, email],
    },
    created: true,
    email,
  }
}

export const applyFollowDelta = (
  metadata: Record<string, unknown> | null | undefined,
  delta: 1 | -1
) => {
  const next = Math.max(0, readFollowerCount(metadata) + delta)
  return {
    ...(metadata ?? {}),
    follower_count: next,
  }
}

export const countUniqueStoreFollowers = (
  customers: Array<{ id?: string; metadata?: Record<string, unknown> | null }>,
  storeId: string
) => new Set(customers.filter((customer) => {
  const followed = customer.metadata?.followed_store_ids
  return Array.isArray(followed) && followed.includes(storeId)
}).map((customer) => customer.id).filter((id): id is string => Boolean(id))).size

export const pickStoreSettingsRow = (rows: StoreSettingsRow[], storeId: string) =>
  rows.find((row) => row.store_id === storeId) ?? rows[0]
