import type { ExecArgs } from "@medusajs/framework/types"
import pg from "pg"

/**
 * 一次性：修正订单 metadata。
 *
 * 1. `fulfillment_status`（自定义履约阶段）会与 Medusa Admin 合并到订单根字段冲突 → 迁至 `mc_fulfillment_status` 并删掉旧键。
 * 2. 仅用 orderModule.updateOrders 无法删除键（服务端合并 metadata），因此使用 SQL。
 *
 * npx medusa exec ./src/scripts/migrate-order-fulfillment-metadata-key.ts
 */
export default async function migrateOrderFulfillmentMetadataKey(_args: ExecArgs) {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is required")
  }

  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    const result = await client.query(`
UPDATE "order"
SET metadata =
  CASE
    WHEN metadata ? 'fulfillment_status' AND NOT (metadata ? 'mc_fulfillment_status') THEN
      (metadata - 'fulfillment_status')
      || jsonb_build_object('mc_fulfillment_status', metadata->'fulfillment_status')
    ELSE metadata - 'fulfillment_status'
  END
WHERE metadata ? 'fulfillment_status';
`)
    console.log(JSON.stringify({ rows_updated: result.rowCount }, null, 2))
  } finally {
    await client.end()
  }
}
