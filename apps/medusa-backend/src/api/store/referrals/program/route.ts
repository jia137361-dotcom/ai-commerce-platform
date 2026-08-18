import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => res.json({
  program: {
    name: "Customized Products",
    description: "Custom-print products with AI-powered design and mockup services.",
    first_order_rate_percent: 25,
    future_order_rate_percent: 8,
    future_order_months: 12,
    currency_code: "usd",
    minimum_payout: Number(process.env.WALLET_MIN_WITHDRAWAL_MAJOR ?? 5),
    payout_schedule: "monthly",
    eligible_amount_excludes: ["shipping", "tax", "import_fee", "export_fee", "coupon", "discount"],
  },
})
