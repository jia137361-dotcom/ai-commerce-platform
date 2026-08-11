import type StoreCoreModuleService from "../../modules/store-core/service"

export type RecordAuditInput = {
  actorUserId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  storeId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function recordPlatformAuditEvent(
  storeCore: StoreCoreModuleService,
  input: RecordAuditInput
): Promise<void> {
  await storeCore.createPlatformAuditEvents({
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    store_id: input.storeId ?? null,
    metadata: input.metadata ?? null,
  })
}

export function parsePagination(query: Record<string, unknown>, defaults?: { limit?: number; offset?: number }) {
  const limitRaw = Number(query.limit ?? defaults?.limit ?? 20)
  const offsetRaw = Number(query.offset ?? defaults?.offset ?? 0)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0
  return { limit, offset }
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function lastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export function bucketCreatedAtByDay(
  rows: Array<{ created_at?: Date | string | null }>,
  days: string[]
): Array<{ date: string; count: number }> {
  const counts = new Map(days.map((day) => [day, 0]))
  for (const row of rows) {
    if (!row.created_at) continue
    const day = new Date(row.created_at).toISOString().slice(0, 10)
    if (counts.has(day)) {
      counts.set(day, (counts.get(day) ?? 0) + 1)
    }
  }
  return days.map((date) => ({ date, count: counts.get(date) ?? 0 }))
}
