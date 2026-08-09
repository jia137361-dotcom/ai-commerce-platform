import type { ExecArgs } from "./medusa-exec-args"
import {
  RefundPaymentContextError,
  resolveRefundPaymentContext,
} from "../lib/refund-payment-context"

const DEFAULT_PROVIDER_ID = "pp_paypal_paypal"

type InspectArgs = {
  orderId: string
  amount?: string
  currency?: string
  provider: string
}

const readFlag = (argv: string[], name: string) => {
  const inline = argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === name) return argv[index + 1]
  }
  return undefined
}

export function parseInspectRefundPaymentContextArgs(argv = process.argv.slice(2)): InspectArgs {
  const orderId = readFlag(argv, "--order-id")
  if (!orderId) throw new Error("Missing required --order-id")
  return {
    orderId,
    amount: readFlag(argv, "--amount"),
    currency: readFlag(argv, "--currency"),
    provider: readFlag(argv, "--provider") ?? DEFAULT_PROVIDER_ID,
  }
}

export async function runInspectRefundPaymentContext({
  container,
  argv = process.argv.slice(2),
  env = process.env,
}: ExecArgs & {
  argv?: string[]
  env?: Record<string, string | undefined>
}) {
  if (env.NODE_ENV === "production") {
    throw new Error("inspect-refund-payment-context refuses NODE_ENV=production")
  }

  const args = parseInspectRefundPaymentContextArgs(argv)
  return resolveRefundPaymentContext({
    container,
    orderId: args.orderId,
    requestedAmount: args.amount,
    requestedCurrency: args.currency,
    expectedProviderId: args.provider,
  })
}

export default async function inspectRefundPaymentContext({
  container,
}: ExecArgs) {
  try {
    const context = await runInspectRefundPaymentContext({ container })
    console.log(JSON.stringify(context, null, 2))
  } catch (error) {
    const payload = error instanceof RefundPaymentContextError
      ? { error: error.code, message: error.message }
      : { error: "INSPECTION_FAILED", message: error instanceof Error ? error.message : String(error) }
    console.error(JSON.stringify(payload, null, 2))
    process.exitCode = 1
  }
}
