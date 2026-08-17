import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaExecArgs } from "./medusa-exec-args"
import { parseLegacyMoneyMigrationMode } from "../lib/legacy-money-migration"

const MARKER_KEY = "citigoo_medusa_major_units_v1"
const MARKER_TABLE = "application_migration_marker"
const BACKUP_TABLE = "citigoo_money_migration_backup"

const ZERO_DECIMAL = [
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]
const THREE_DECIMAL = ["bhd", "jod", "kwd", "omr", "tnd"]
const CONVERTIBLE_COLLECTION_STATUSES = ["pending", "not_paid", "canceled"]
const CONVERTIBLE_SESSION_STATUSES = ["pending", "error", "canceled"]
const CONVERTIBLE_ATTEMPT_STATUSES = ["created", "expired", "payment_failed", "awaiting_payment"]

type RawResult = {
  rows?: Array<Record<string, unknown>>
  rowCount?: number
}

type SqlConnection = {
  raw: (sql: string, bindings?: unknown[]) => Promise<RawResult>
  transaction: <T>(callback: (transaction: SqlConnection) => Promise<T>) => Promise<T>
}

export type MoneyMigrationReport = {
  marker: string
  mode: "dry-run" | "apply"
  already_applied: boolean
  eligible: {
    prices: number
    carts: number
    cart_lines: number
    shipping_methods: number
    payment_collections: number
    payment_sessions: number
    payment_attempts_to_reset: number
  }
  protected: {
    carts: number
    orders: number
    payment_collections: number
    payment_sessions: number
    payments: number
    captures: number
    refunds: number
    order_43: number
  }
  ambiguous: number
  applied_rows: number
}

const quotedList = (values: string[]) => values.map((value) => `'${value}'`).join(", ")

const currencyFactorSql = (alias: string) => `(
  case
    when lower(${alias}.currency_code) in (${quotedList(ZERO_DECIMAL)}) then 1
    when lower(${alias}.currency_code) in (${quotedList(THREE_DECIMAL)}) then 1000
    else 100
  end
)`

const rawAmountMismatchSql = (alias: string, rawColumn: string, amountColumn: string) => `(
  ${alias}.${rawColumn} is not null and (
    jsonb_typeof(${alias}.${rawColumn}) <> 'object'
    or not (${alias}.${rawColumn} ? 'value')
    or case
      when (${alias}.${rawColumn}->>'value') ~ '^-?[0-9]+(\\.[0-9]+)?$'
        then (${alias}.${rawColumn}->>'value')::numeric <> ${alias}.${amountColumn}
      else true
    end
  )
)`

const CART_GUARD_CTE = `
with cart_guards as (
  select c.id,
    (
      c.completed_at is not null
      or c.deleted_at is not null
      or exists (
        select 1 from order_cart oc
        where oc.cart_id = c.id and oc.deleted_at is null
      )
      or exists (
        select 1
        from cart_payment_collection cpc
        join payment_collection pc on pc.id = cpc.payment_collection_id and pc.deleted_at is null
        where cpc.cart_id = c.id and cpc.deleted_at is null
          and (
            lower(coalesce(pc.status, '')) not in (${quotedList(CONVERTIBLE_COLLECTION_STATUSES)})
            or pc.completed_at is not null
            or coalesce(pc.authorized_amount, 0) > 0
            or coalesce(pc.captured_amount, 0) > 0
            or coalesce(pc.refunded_amount, 0) > 0
            or exists (
              select 1 from payment p
              where p.payment_collection_id = pc.id and p.deleted_at is null
            )
            or exists (
              select 1 from payment_session ps
              where ps.payment_collection_id = pc.id and ps.deleted_at is null
                and lower(coalesce(ps.status, '')) not in (${quotedList(CONVERTIBLE_SESSION_STATUSES)})
            )
          )
      )
      or exists (
        select 1 from checkout_payment_attempt attempt
        where attempt.cart_id = c.id and attempt.deleted_at is null
          and (
            attempt.completed_order_id is not null
            or lower(coalesce(attempt.status, '')) not in (${quotedList(CONVERTIBLE_ATTEMPT_STATUSES)})
          )
      )
    ) as protected
  from cart c
),
convertible_carts as (
  select id from cart_guards where protected = false
)
`

const emptyReport = (mode: MoneyMigrationReport["mode"], alreadyApplied: boolean): MoneyMigrationReport => ({
  marker: MARKER_KEY,
  mode,
  already_applied: alreadyApplied,
  eligible: {
    prices: 0,
    carts: 0,
    cart_lines: 0,
    shipping_methods: 0,
    payment_collections: 0,
    payment_sessions: 0,
    payment_attempts_to_reset: 0,
  },
  protected: {
    carts: 0,
    orders: 0,
    payment_collections: 0,
    payment_sessions: 0,
    payments: 0,
    captures: 0,
    refunds: 0,
    order_43: 0,
  },
  ambiguous: 0,
  applied_rows: 0,
})

const count = (value: unknown) => Number(value ?? 0) || 0

const markerExists = async (connection: SqlConnection) => {
  const table = await connection.raw("select to_regclass(?) as table_name", [MARKER_TABLE])
  if (!table.rows?.[0]?.table_name) return false
  const result = await connection.raw(`select 1 from ${MARKER_TABLE} where key = ? limit 1`, [MARKER_KEY])
  return Boolean(result.rows?.length)
}

const inspectMigration = async (
  connection: SqlConnection,
  mode: MoneyMigrationReport["mode"]
): Promise<MoneyMigrationReport> => {
  const result = await connection.raw(`${CART_GUARD_CTE}
select
  (select count(*) from price p where p.deleted_at is null) as eligible_prices,
  (select count(*) from convertible_carts) as eligible_carts,
  (select count(*) from cart_line_item li join convertible_carts cc on cc.id = li.cart_id where li.deleted_at is null) as eligible_cart_lines,
  (select count(*) from cart_shipping_method sm join convertible_carts cc on cc.id = sm.cart_id where sm.deleted_at is null) as eligible_shipping_methods,
  (select count(*) from payment_collection pc join cart_payment_collection cpc on cpc.payment_collection_id = pc.id and cpc.deleted_at is null join convertible_carts cc on cc.id = cpc.cart_id where pc.deleted_at is null) as eligible_payment_collections,
  (select count(*) from payment_session ps join payment_collection pc on pc.id = ps.payment_collection_id and pc.deleted_at is null join cart_payment_collection cpc on cpc.payment_collection_id = pc.id and cpc.deleted_at is null join convertible_carts cc on cc.id = cpc.cart_id where ps.deleted_at is null) as eligible_payment_sessions,
  (select count(*) from checkout_payment_attempt attempt join convertible_carts cc on cc.id = attempt.cart_id where attempt.deleted_at is null) as eligible_payment_attempts,
  (select count(*) from cart_guards where protected = true) as protected_carts,
  (select count(*) from "order" o where o.deleted_at is null) as protected_orders,
  (select count(*) from payment_collection pc where pc.deleted_at is null and not exists (
    select 1 from cart_payment_collection cpc join convertible_carts cc on cc.id = cpc.cart_id
    where cpc.payment_collection_id = pc.id and cpc.deleted_at is null
  )) as protected_payment_collections,
  (select count(*) from payment_session ps where ps.deleted_at is null and not exists (
    select 1 from payment_collection pc join cart_payment_collection cpc on cpc.payment_collection_id = pc.id and cpc.deleted_at is null join convertible_carts cc on cc.id = cpc.cart_id
    where pc.id = ps.payment_collection_id and pc.deleted_at is null
  )) as protected_payment_sessions,
  (select count(*) from payment p where p.deleted_at is null) as protected_payments,
  (select count(*) from capture cap where cap.deleted_at is null) as protected_captures,
  (select count(*) from refund r where r.deleted_at is null) as protected_refunds,
  (select count(*) from "order" o where o.deleted_at is null and o.display_id = 43) as protected_order_43,
  (
    (select count(*) from price p where p.deleted_at is null and (
      coalesce(trim(p.currency_code), '') = '' or p.amount <> trunc(p.amount) or ${rawAmountMismatchSql("p", "raw_amount", "amount")}
    ))
    + (select count(*) from cart_line_item li join convertible_carts cc on cc.id = li.cart_id join cart c on c.id = li.cart_id where li.deleted_at is null and (
      coalesce(trim(c.currency_code), '') = '' or li.unit_price <> trunc(li.unit_price) or ${rawAmountMismatchSql("li", "raw_unit_price", "unit_price")}
    ))
    + (select count(*) from cart_shipping_method sm join convertible_carts cc on cc.id = sm.cart_id join cart c on c.id = sm.cart_id where sm.deleted_at is null and (
      coalesce(trim(c.currency_code), '') = '' or sm.amount <> trunc(sm.amount) or ${rawAmountMismatchSql("sm", "raw_amount", "amount")}
    ))
    + (select count(*) from payment_collection pc join cart_payment_collection cpc on cpc.payment_collection_id = pc.id and cpc.deleted_at is null join convertible_carts cc on cc.id = cpc.cart_id where pc.deleted_at is null and (
      coalesce(trim(pc.currency_code), '') = '' or pc.amount <> trunc(pc.amount) or ${rawAmountMismatchSql("pc", "raw_amount", "amount")}
    ))
    + (select count(*) from payment_session ps join payment_collection pc on pc.id = ps.payment_collection_id and pc.deleted_at is null join cart_payment_collection cpc on cpc.payment_collection_id = pc.id and cpc.deleted_at is null join convertible_carts cc on cc.id = cpc.cart_id where ps.deleted_at is null and (
      coalesce(trim(ps.currency_code), '') = '' or ps.amount <> trunc(ps.amount) or ${rawAmountMismatchSql("ps", "raw_amount", "amount")}
    ))
  ) as ambiguous
`)
  const row = result.rows?.[0] ?? {}
  return {
    ...emptyReport(mode, false),
    eligible: {
      prices: count(row.eligible_prices),
      carts: count(row.eligible_carts),
      cart_lines: count(row.eligible_cart_lines),
      shipping_methods: count(row.eligible_shipping_methods),
      payment_collections: count(row.eligible_payment_collections),
      payment_sessions: count(row.eligible_payment_sessions),
      payment_attempts_to_reset: count(row.eligible_payment_attempts),
    },
    protected: {
      carts: count(row.protected_carts),
      orders: count(row.protected_orders),
      payment_collections: count(row.protected_payment_collections),
      payment_sessions: count(row.protected_payment_sessions),
      payments: count(row.protected_payments),
      captures: count(row.protected_captures),
      refunds: count(row.protected_refunds),
      order_43: count(row.protected_order_43),
    },
    ambiguous: count(row.ambiguous),
  }
}

const backupEligibleRows = async (connection: SqlConnection) => {
  await connection.raw(`create table if not exists ${BACKUP_TABLE} (
    marker_key text not null,
    table_name text not null,
    row_id text not null,
    payload jsonb not null,
    backed_up_at timestamptz not null default now(),
    primary key (marker_key, table_name, row_id)
  )`)
  const backups = [
    `insert into ${BACKUP_TABLE} (marker_key, table_name, row_id, payload) select ?, 'price', p.id, to_jsonb(p) from price p where p.deleted_at is null on conflict do nothing`,
    `${CART_GUARD_CTE} insert into ${BACKUP_TABLE} (marker_key, table_name, row_id, payload) select ?, 'cart_line_item', li.id, to_jsonb(li) from cart_line_item li join convertible_carts cc on cc.id = li.cart_id where li.deleted_at is null on conflict do nothing`,
    `${CART_GUARD_CTE} insert into ${BACKUP_TABLE} (marker_key, table_name, row_id, payload) select ?, 'cart_shipping_method', sm.id, to_jsonb(sm) from cart_shipping_method sm join convertible_carts cc on cc.id = sm.cart_id where sm.deleted_at is null on conflict do nothing`,
    `${CART_GUARD_CTE} insert into ${BACKUP_TABLE} (marker_key, table_name, row_id, payload) select ?, 'payment_collection', pc.id, to_jsonb(pc) from payment_collection pc join cart_payment_collection cpc on cpc.payment_collection_id = pc.id and cpc.deleted_at is null join convertible_carts cc on cc.id = cpc.cart_id where pc.deleted_at is null on conflict do nothing`,
    `${CART_GUARD_CTE} insert into ${BACKUP_TABLE} (marker_key, table_name, row_id, payload) select ?, 'payment_session', ps.id, to_jsonb(ps) from payment_session ps join payment_collection pc on pc.id = ps.payment_collection_id and pc.deleted_at is null join cart_payment_collection cpc on cpc.payment_collection_id = pc.id and cpc.deleted_at is null join convertible_carts cc on cc.id = cpc.cart_id where ps.deleted_at is null on conflict do nothing`,
    `${CART_GUARD_CTE} insert into ${BACKUP_TABLE} (marker_key, table_name, row_id, payload) select ?, 'checkout_payment_attempt', attempt.id, to_jsonb(attempt) from checkout_payment_attempt attempt join convertible_carts cc on cc.id = attempt.cart_id where attempt.deleted_at is null on conflict do nothing`,
  ]
  for (const sql of backups) await connection.raw(sql, [MARKER_KEY])
}

const convertedRawAmountSql = (alias: string, rawColumn: string, amountColumn: string, factor: string) => `
case when ${alias}.${rawColumn} is null then null else
  jsonb_set(${alias}.${rawColumn}, '{value}', to_jsonb((${alias}.${amountColumn} / ${factor})::text), true)
end`

const applyUpdates = async (connection: SqlConnection) => {
  const statements = [
    `update price p set raw_amount = ${convertedRawAmountSql("p", "raw_amount", "amount", currencyFactorSql("p"))}, amount = p.amount / ${currencyFactorSql("p")}, updated_at = now() where p.deleted_at is null`,
    `${CART_GUARD_CTE} update cart_line_item li set raw_unit_price = ${convertedRawAmountSql("li", "raw_unit_price", "unit_price", currencyFactorSql("c"))}, unit_price = li.unit_price / ${currencyFactorSql("c")}, updated_at = now() from convertible_carts cc, cart c where cc.id = li.cart_id and c.id = li.cart_id and li.deleted_at is null`,
    `${CART_GUARD_CTE} update cart_shipping_method sm set raw_amount = ${convertedRawAmountSql("sm", "raw_amount", "amount", currencyFactorSql("c"))}, amount = sm.amount / ${currencyFactorSql("c")}, updated_at = now() from convertible_carts cc, cart c where cc.id = sm.cart_id and c.id = sm.cart_id and sm.deleted_at is null`,
    `${CART_GUARD_CTE} update payment_collection pc set raw_amount = ${convertedRawAmountSql("pc", "raw_amount", "amount", currencyFactorSql("pc"))}, amount = pc.amount / ${currencyFactorSql("pc")}, updated_at = now() from cart_payment_collection cpc, convertible_carts cc where cpc.payment_collection_id = pc.id and cpc.deleted_at is null and cc.id = cpc.cart_id and pc.deleted_at is null`,
    `${CART_GUARD_CTE} update payment_session ps set raw_amount = ${convertedRawAmountSql("ps", "raw_amount", "amount", currencyFactorSql("ps"))}, amount = ps.amount / ${currencyFactorSql("ps")}, status = 'canceled', updated_at = now() from payment_collection pc, cart_payment_collection cpc, convertible_carts cc where pc.id = ps.payment_collection_id and pc.deleted_at is null and cpc.payment_collection_id = pc.id and cpc.deleted_at is null and cc.id = cpc.cart_id and ps.deleted_at is null`,
    `${CART_GUARD_CTE} update checkout_payment_attempt attempt set payment_collection_id = null, payment_session_id = null, provider_payment_id = null, status = 'created', last_error = 'Payment session reset by canonical money migration.', expires_at = null, updated_at = now() from convertible_carts cc where cc.id = attempt.cart_id and attempt.deleted_at is null`,
  ]
  let appliedRows = 0
  for (const sql of statements) {
    const result = await connection.raw(sql)
    appliedRows += count(result.rowCount)
  }
  return appliedRows
}

export const runMedusaMoneyMajorUnitMigration = async (
  connection: SqlConnection,
  mode: MoneyMigrationReport["mode"]
): Promise<MoneyMigrationReport> => connection.transaction(async (transaction) => {
  await transaction.raw("set transaction isolation level serializable")
  await transaction.raw("select pg_advisory_xact_lock(hashtext(?))", [MARKER_KEY])
  if (await markerExists(transaction)) return emptyReport(mode, true)

  const report = await inspectMigration(transaction, mode)
  if (mode === "dry-run") return report
  if (report.ambiguous > 0) {
    throw new Error(`Refusing money migration because ${report.ambiguous} ambiguous rows require review.`)
  }

  await transaction.raw(`create table if not exists ${MARKER_TABLE} (
    key text primary key,
    applied_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb
  )`)
  await backupEligibleRows(transaction)
  const appliedRows = await applyUpdates(transaction)
  const appliedReport = { ...report, applied_rows: appliedRows }
  await transaction.raw(
    `insert into ${MARKER_TABLE} (key, metadata) values (?, ?::jsonb)`,
    [MARKER_KEY, JSON.stringify(appliedReport)]
  )
  return appliedReport
})

export default async function migrateMedusaMoneyMajorUnits({ container }: MedusaExecArgs) {
  const mode = parseLegacyMoneyMigrationMode(
    process.argv.slice(2).filter((argument) => argument.startsWith("--"))
  )
  const connection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as SqlConnection
  const report = await runMedusaMoneyMajorUnitMigration(connection, mode)
  console.log("MEDUSA_MONEY_MAJOR_UNIT_MIGRATION", JSON.stringify(report))
}
