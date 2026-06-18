import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  completeCartWorkflow,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows"
import createCartWorkflow from "../workflows/create-cart"
import addLineItemWorkflow from "../workflows/add-line-item"
import { ensureCartPaymentReady } from "../lib/ensure-cart-payment-ready"
import { setOrderPostCompletePendingMetadata } from "../lib/sync-order-paid-fulfillment"
import { readOrderStoreId } from "../lib/order-store-context"
import {
  evaluateCancellationEligibility,
  type CancellationContext,
  type CancellationOrder,
} from "../lib/order-cancellation"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../modules/fulfillment-orders/service"

const DEFAULT_STORE_ID = "default_store"
const DEFAULT_CUSTOMER_EMAIL = "batch12a.cancel+smoke@example.com"
const DEFAULT_PAYMENT_PROVIDER = "pp_system_default"
const SMOKE_METADATA_FLAG = "batch12a_cancel_smoke"

type EnvLike = Record<string, string | undefined>

type QueryGraph = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    options?: Record<string, unknown>
  }) => Promise<{ data: Array<Record<string, unknown>> }>
}

type SmokeCustomer = {
  id: string
  email: string
}

type SmokeOrderSummary = {
  customer_id: string
  customer_email: string
  cart_id: string | null
  order_id: string
  display_id: string | number | null
  sales_channel_id: string | null
  region_id: string | null
  currency_code: string | null
  variant_id: string | null
  line_item_unit_price: number | null
  order_status: string | null
  payment_status: string | null
  captured_amount: number
  fulfillment_status: string | null
  fulfillment_count: number
  store_id: string
  cancellation_allowed: true
}

type SmokeStep =
  | "resolve_customer"
  | "resolve_variant"
  | "resolve_region"
  | "resolve_sales_channel"
  | "create_cart"
  | "bind_customer_before_items"
  | "add_line_item"
  | "complete_cart_without_paid_sync"
  | "retrieve_order"
  | "assert_cancellation_eligibility"

const readString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const readNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value && typeof value === "object") {
    const objectValue = value as { value?: unknown; numeric?: unknown }
    return readNumber(objectValue.value ?? objectValue.numeric)
  }
  return 0
}

const logSmokeStep = (step: SmokeStep, details?: Record<string, unknown>) => {
  if (process.env.NODE_ENV !== "production") {
    console.info("[batch12a-cancel-smoke] step", {
      step,
      ...(details ?? {}),
    })
  }
}

export function assertBatch12aSmokeEnabled(env: EnvLike = process.env) {
  if (env.NODE_ENV === "production") {
    throw new Error("Batch 12A cancel smoke setup cannot run in production")
  }
  if (env.BATCH12A_CANCEL_SMOKE_ENABLED !== "true") {
    throw new Error(
      "Set BATCH12A_CANCEL_SMOKE_ENABLED=true to run the Batch 12A cancel smoke setup"
    )
  }
}

async function queryFirst(
  query: QueryGraph,
  entity: string,
  filters: Record<string, unknown>,
  fields: string[]
) {
  const { data } = await query.graph({
    entity,
    filters,
    fields,
    options: { throwIfKeyNotFound: false },
  })
  return data[0] ?? null
}

export async function resolveSmokeCustomer(
  container: ExecArgs["container"],
  emailInput: string
): Promise<SmokeCustomer> {
  const email = normalizeEmail(emailInput)
  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as {
    listCustomers: (filters: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
    createCustomers: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
  }

  const existing = await customerModule.listCustomers({ email })
  const customer = existing.find((row) => readString(row.id))
  if (customer?.id) {
    return { id: String(customer.id), email }
  }

  const created = await customerModule.createCustomers({
    email,
    first_name: "Batch12A",
    last_name: "Smoke",
    metadata: {
      batch12a_cancel_smoke_customer: true,
    },
  })
  const createdId = readString(created.id)
  if (!createdId) {
    throw new Error(`Unable to create smoke customer for ${email}`)
  }
  return { id: createdId, email }
}

export async function resolveSmokeVariantId(
  container: ExecArgs["container"],
  storeId: string,
  env: EnvLike = process.env
) {
  const envVariantId = readString(env.BATCH12A_CANCEL_SMOKE_VARIANT_ID)
  if (envVariantId) return envVariantId

  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const productModule = container.resolve(Modules.PRODUCT) as unknown as {
    retrieveProductVariant: (
      id: string,
      config?: Record<string, unknown>
    ) => Promise<Record<string, unknown>>
  }

  const products = await storeCore.listProducts({
    store_id: storeId,
    status: "published",
  })
  for (const product of products as Array<Record<string, unknown>>) {
    const variantId = readString(product.medusa_variant_id)
    if (!variantId) continue
    try {
      const variant = await productModule.retrieveProductVariant(variantId, {
        select: ["id", "requires_shipping"],
      })
      if (variant.requires_shipping === false) {
        return variantId
      }
    } catch {
      continue
    }
  }

  throw new Error(
    "Unable to resolve a non-shippable smoke variant. Set BATCH12A_CANCEL_SMOKE_VARIANT_ID explicitly."
  )
}

async function readCartPaymentCollectionId(query: QueryGraph, cartId: string) {
  const cartRow = await queryFirst(query, "cart", { id: cartId }, [
    "id",
    "payment_collection.id",
  ])
  const paymentCollection = cartRow?.payment_collection as
    | { id?: unknown }
    | null
    | undefined
  return readString(paymentCollection?.id)
}

async function findExistingEligibleSmokeOrder(
  container: ExecArgs["container"],
  customer: SmokeCustomer,
  storeId: string
) {
  const orderModule = container.resolve(Modules.ORDER) as {
    listOrders: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<CancellationOrder[]>
  }
  const orders = await orderModule.listOrders(
    { customer_id: customer.id },
    {
      select: [
        "id",
        "display_id",
        "customer_id",
        "status",
        "payment_status",
        "fulfillment_status",
        "canceled_at",
        "metadata",
      ],
      order: { created_at: "DESC" },
      take: 20,
    }
  )

  for (const order of orders) {
    if ((order.metadata ?? {})[SMOKE_METADATA_FLAG] !== true) continue
    if (readOrderStoreId(order) !== storeId) continue
    if (order.canceled_at || order.cancelled_at || order.status === "canceled") continue
    const summary = await validateCancellationSmokeOrder(container, order.id!, customer, storeId)
    return summary
  }

  return null
}

async function readOrderForCancellation(
  container: ExecArgs["container"],
  orderId: string
): Promise<CancellationOrder> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
  const row = await queryFirst(query, "order", { id: orderId }, [
    "id",
    "display_id",
    "customer_id",
    "status",
    "payment_status",
    "fulfillment_status",
    "canceled_at",
    "metadata",
    "payment_collections.id",
    "payment_collections.status",
    "payment_collections.captured_amount",
    "payment_collections.raw_captured_amount",
    "payment_collections.payments.id",
    "payment_collections.payments.status",
    "payment_collections.payments.captured_at",
    "payment_collections.payments.captures.id",
    "payment_collections.payments.captures.amount",
    "payment_collections.payments.captures.raw_amount",
    "payment_collections.payment_sessions.status",
    "fulfillments.id",
    "fulfillments.status",
    "fulfillments.canceled_at",
    "fulfillments.shipped_at",
    "fulfillments.delivered_at",
  ])
  if (!row?.id) {
    throw new Error(`Unable to retrieve smoke order ${orderId}`)
  }
  return row as CancellationOrder
}

function sumCapturedAmount(order: CancellationOrder) {
  return (order.payment_collections ?? []).reduce((sum, collection) => {
    const collectionCaptured =
      readNumber(collection.captured_amount) +
      readNumber(collection.raw_captured_amount)
    const paymentCaptured = (collection.payments ?? []).reduce((paymentSum, payment) => {
      const captureSum = (payment.captures ?? []).reduce(
        (captureTotal, capture) =>
          captureTotal +
          readNumber(capture.amount) +
          readNumber(capture.raw_amount),
        0
      )
      return paymentSum + captureSum
    }, 0)
    return sum + collectionCaptured + paymentCaptured
  }, 0)
}

export async function validateCancellationSmokeOrder(
  container: ExecArgs["container"],
  orderId: string,
  customer: SmokeCustomer,
  storeId: string
): Promise<SmokeOrderSummary> {
  const order = await readOrderForCancellation(container, orderId)
  const foService = container.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
  const customFulfillments = await foService.listFulfillmentOrders({ order_id: [orderId] })
  const context: CancellationContext = {
    order,
    paymentStateResolved: Object.prototype.hasOwnProperty.call(order, "payment_collections"),
    fulfillmentStateResolved: Object.prototype.hasOwnProperty.call(order, "fulfillments"),
    customFulfillmentOrders: customFulfillments,
  }
  const eligibility = evaluateCancellationEligibility(context, {
    authCustomerId: customer.id,
    requestedStoreId: storeId,
  })
  if (!eligibility.allowed) {
    throw new Error(
      `Batch 12A smoke order is not cancellable: ${eligibility.code} ${eligibility.message}`
    )
  }

  const capturedAmount = sumCapturedAmount(order)
  if (capturedAmount !== 0) {
    throw new Error(`Batch 12A smoke order captured amount must be 0, got ${capturedAmount}`)
  }

  const fulfillmentCount = (order.fulfillments ?? []).length + customFulfillments.length
  if (fulfillmentCount !== 0) {
    throw new Error(`Batch 12A smoke order fulfillment count must be 0, got ${fulfillmentCount}`)
  }

  return {
    customer_id: customer.id,
    customer_email: customer.email,
    cart_id: readString(order.metadata?.batch12a_smoke_cart_id),
    order_id: order.id!,
    display_id: order.display_id ?? null,
    sales_channel_id: readString(order.metadata?.batch12a_smoke_sales_channel_id),
    region_id: readString(order.metadata?.batch12a_smoke_region_id),
    currency_code: readString(order.metadata?.batch12a_smoke_currency_code),
    variant_id: readString(order.metadata?.batch12a_smoke_variant_id),
    line_item_unit_price: readNumber(order.metadata?.batch12a_smoke_line_item_unit_price) || null,
    order_status: order.status ?? null,
    payment_status:
      order.payment_status ??
      (order.metadata?.payment_status as string | undefined) ??
      null,
    captured_amount: capturedAmount,
    fulfillment_status:
      order.fulfillment_status ??
      (order.metadata?.mc_fulfillment_status as string | undefined) ??
      null,
    fulfillment_count: fulfillmentCount,
    store_id: readOrderStoreId(order) ?? storeId,
    cancellation_allowed: true,
  }
}

export async function createBatch12aCancellationSmokeOrder({
  container,
  env = process.env,
}: {
  container: ExecArgs["container"]
  env?: EnvLike
}): Promise<SmokeOrderSummary> {
  assertBatch12aSmokeEnabled(env)
  let lastStep: SmokeStep | null = null
  const step = (name: SmokeStep, details?: Record<string, unknown>) => {
    lastStep = name
    logSmokeStep(name, details)
  }

  try {
    const storeId = readString(env.BATCH12A_STORE_ID) ?? DEFAULT_STORE_ID
    const customerEmail = readString(env.BATCH12A_CUSTOMER_EMAIL) ?? DEFAULT_CUSTOMER_EMAIL
    const providerId =
      readString(env.BATCH12A_PAYMENT_PROVIDER_ID) ?? DEFAULT_PAYMENT_PROVIDER

    step("resolve_customer", { customer_email: normalizeEmail(customerEmail) })
    const customer = await resolveSmokeCustomer(container, customerEmail)

    const existing = await findExistingEligibleSmokeOrder(container, customer, storeId)
    if (existing) return existing

    const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryGraph
    step("resolve_variant")
    const variantId = await resolveSmokeVariantId(container, storeId, env)

    step("create_cart", { store_id: storeId, variant_id: variantId })
    const { result: cartResult } = await createCartWorkflow(container).run({
      input: {
        store_id: storeId,
        customer_email: customer.email,
      },
    })
    const cartId = cartResult.cart.id
    const salesChannelId = readString(cartResult.cart.sales_channel_id)
    const regionId = readString(cartResult.cart.region_id)
    const currencyCode = readString(cartResult.cart.currency_code)
    step("resolve_region", { cart_id: cartId, region_id: regionId })
    step("resolve_sales_channel", { cart_id: cartId, sales_channel_id: salesChannelId })

    step("bind_customer_before_items", { cart_id: cartId, customer_id: customer.id })
    await updateCartWorkflow(container).run({
      input: {
        id: cartId,
        customer_id: customer.id,
        email: customer.email,
        metadata: {
          ...(cartResult.cart.metadata ?? {}),
          store_id: storeId,
          [SMOKE_METADATA_FLAG]: true,
        },
      },
    })

    step("add_line_item", { cart_id: cartId, variant_id: variantId })
    const { result: addLineResult } = await addLineItemWorkflow(container).run({
      input: {
        cart_id: cartId,
        variant_id: variantId,
        quantity: 1,
      },
    })
    const lineItemUnitPrice = readNumber(
      (addLineResult as { lineItem?: { unit_price?: unknown } })?.lineItem?.unit_price
    )

    await ensureCartPaymentReady(container, cartId, providerId)
    const paymentCollectionId = await readCartPaymentCollectionId(query, cartId)

    step("complete_cart_without_paid_sync", { cart_id: cartId })
    const { result } = await completeCartWorkflow(container).run({
      input: { id: cartId },
    })
    const orderId = readString((result as { id?: unknown }).id)
    if (!orderId) {
      throw new Error("Batch 12A smoke complete did not return an order id")
    }

    await setOrderPostCompletePendingMetadata(container, orderId, storeId)

    const orderModule = container.resolve(Modules.ORDER) as {
      retrieveOrder: (id: string) => Promise<CancellationOrder>
      updateOrders: (id: string, data: Record<string, unknown>) => Promise<unknown>
    }
    step("retrieve_order", { order_id: orderId })
    let order = await orderModule.retrieveOrder(orderId)
    const orderMeta = {
      ...(order.metadata ?? {}),
      store_id: storeId,
      [SMOKE_METADATA_FLAG]: true,
      batch12a_smoke_cart_id: cartId,
      batch12a_smoke_variant_id: variantId,
      batch12a_smoke_sales_channel_id: salesChannelId,
      batch12a_smoke_region_id: regionId,
      batch12a_smoke_currency_code: currencyCode,
      batch12a_smoke_line_item_unit_price: lineItemUnitPrice || null,
      ...(paymentCollectionId ? { batch12a_smoke_payment_collection_id: paymentCollectionId } : {}),
    }
    await orderModule.updateOrders(orderId, { metadata: orderMeta })
    order = await orderModule.retrieveOrder(orderId)
    if (order.customer_id !== customer.id) {
      await orderModule.updateOrders(orderId, { customer_id: customer.id })
    }

    step("assert_cancellation_eligibility", { order_id: orderId })
    return validateCancellationSmokeOrder(container, orderId, customer, storeId)
  } catch (error) {
    if (lastStep && error instanceof Error) {
      error.message = `${error.message} (last_step=${lastStep})`
    }
    throw error
  }
}

export default async function batch12aCancelSmokeSetup({ container }: ExecArgs) {
  const summary = await createBatch12aCancellationSmokeOrder({ container })
  console.log(JSON.stringify(summary, null, 2))
}
