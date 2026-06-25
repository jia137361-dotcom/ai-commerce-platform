export type StorePolicyPresetFields = {
  shipping_processing?: string
  shipping_international?: string
  shipping_customs?: string
  returns_window?: string
  returns_shipping?: string
  returns_condition?: string
  cancellation_timing?: string
  payment_preset?: string
  privacy_preset?: string
}

export type PolicyOption = {
  value: string
  label: string
  description?: string
}

export const DEFAULT_STORE_POLICY_PRESETS: Required<StorePolicyPresetFields> = {
  shipping_processing: "3_5",
  shipping_international: "yes",
  shipping_customs: "buyer_pays",
  returns_window: "30",
  returns_shipping: "buyer_pays",
  returns_condition: "unused_original",
  cancellation_timing: "before_production",
  payment_preset: "stripe_standard",
  privacy_preset: "platform_standard",
}

export const SHIPPING_PROCESSING_OPTIONS: PolicyOption[] = [
  { value: "1_3", label: "1–3 business days", description: "Fast processing for in-stock or quick production items." },
  { value: "3_5", label: "3–5 business days", description: "Standard made-to-order processing window." },
  { value: "5_7", label: "5–7 business days", description: "Longer production or quality-check window." },
  { value: "7_14", label: "7–14 business days", description: "Extended production for complex custom items." },
]

export const SHIPPING_INTERNATIONAL_OPTIONS: PolicyOption[] = [
  { value: "yes", label: "Ships internationally", description: "Available to buyers outside your primary market where carriers support delivery." },
  { value: "selected_regions", label: "Selected regions only", description: "Limited to regions enabled for this store and product." },
  { value: "domestic_only", label: "Domestic only", description: "No international delivery for this shop." },
]

export const SHIPPING_CUSTOMS_OPTIONS: PolicyOption[] = [
  { value: "buyer_pays", label: "Buyer pays import duties & taxes", description: "Common for cross-border D2C (DDU)." },
  { value: "included_where_required", label: "Duties included where required", description: "Use only when your operations truly include import charges." },
]

export const RETURNS_WINDOW_OPTIONS: PolicyOption[] = [
  { value: "14", label: "14 days from delivery", description: "Meets EU minimum for many consumer sales." },
  { value: "30", label: "30 days from delivery", description: "Common marketplace standard." },
  { value: "60", label: "60 days from delivery", description: "More generous return window." },
  { value: "no_returns", label: "No returns (made-to-order / final sale)", description: "For personalized or perishable custom goods." },
]

export const RETURNS_SHIPPING_OPTIONS: PolicyOption[] = [
  { value: "buyer_pays", label: "Customer pays return shipping", description: "Buyer covers return postage unless item is defective." },
  { value: "free", label: "Free returns", description: "Seller provides a prepaid return label or reimburses postage." },
  { value: "defects_only", label: "Seller pays only for defects", description: "Return shipping covered when item arrives damaged or incorrect." },
]

export const RETURNS_CONDITION_OPTIONS: PolicyOption[] = [
  { value: "unused_original", label: "Unused, original packaging, tags attached", description: "Strictest and most common retail standard." },
  { value: "unused", label: "Unused and resalable", description: "Packaging may be opened if item is undamaged." },
  { value: "custom_final", label: "Custom / personalized items are final sale", description: "No returns on made-to-order personalization." },
]

export const CANCELLATION_TIMING_OPTIONS: PolicyOption[] = [
  { value: "before_production", label: "Before production starts", description: "Best for print-on-demand workflows." },
  { value: "24h", label: "Within 24 hours of placing the order", description: "Short cooling-off window." },
  { value: "before_shipment", label: "Before the order ships", description: "Allowed until carrier handoff." },
]

export const PAYMENT_PRESET_OPTIONS: PolicyOption[] = [
  {
    value: "stripe_standard",
    label: "Cards & wallets (platform standard)",
    description: "Visa, Mastercard, Apple Pay, and Google Pay via Stripe where checkout supports them.",
  },
]

export const PRIVACY_PRESET_OPTIONS: PolicyOption[] = [
  {
    value: "platform_standard",
    label: "Platform privacy template",
    description: "Uses the marketplace privacy baseline plus your shop contact details.",
  },
]

const labelFor = (options: PolicyOption[], value: string | undefined, fallback: string) =>
  options.find((option) => option.value === value)?.label ?? fallback

export function readStorePolicyPresets(metadata: Record<string, unknown> | null | undefined): StorePolicyPresetFields {
  const raw = metadata?.policy_presets
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return raw as StorePolicyPresetFields
}

export function mergeStorePolicyPresets(
  metadata: Record<string, unknown> | null | undefined
): Required<StorePolicyPresetFields> {
  return { ...DEFAULT_STORE_POLICY_PRESETS, ...readStorePolicyPresets(metadata) }
}

export function buildShippingPolicyText(presets: StorePolicyPresetFields): string {
  const processing = labelFor(SHIPPING_PROCESSING_OPTIONS, presets.shipping_processing, "3–5 business days")
  const international = labelFor(SHIPPING_INTERNATIONAL_OPTIONS, presets.shipping_international, "Ships internationally")
  const customs = labelFor(SHIPPING_CUSTOMS_OPTIONS, presets.shipping_customs, "Buyer pays import duties & taxes")

  return [
    `Orders are processed within ${processing.toLowerCase()} before handoff to the carrier.`,
    international,
    customs === "Buyer pays import duties & taxes"
      ? "International buyers are responsible for import duties, taxes, and customs fees charged at delivery unless local law requires otherwise."
      : "Import duties and taxes are included where your order qualifies under the seller's stated shipping program.",
    "Exact shipping methods, rates, and delivery estimates are calculated at checkout based on your delivery address.",
  ].join(" ")
}

export function buildReturnsPolicyText(presets: StorePolicyPresetFields): string {
  if (presets.returns_window === "no_returns" || presets.returns_condition === "custom_final") {
    return "Custom and made-to-order items are final sale unless they arrive damaged, defective, or not as described. Contact the seller with your order number if there is a fulfillment issue."
  }

  const window = labelFor(RETURNS_WINDOW_OPTIONS, presets.returns_window, "30 days from delivery")
  const shipping = labelFor(RETURNS_SHIPPING_OPTIONS, presets.returns_shipping, "Customer pays return shipping")
  const condition = labelFor(RETURNS_CONDITION_OPTIONS, presets.returns_condition, "Unused, original packaging, tags attached")

  return [
    `Returns are accepted within ${window.toLowerCase()}.`,
    `Items must be ${condition.toLowerCase()}.`,
    `${shipping}.`,
    "Refunds are issued to the original payment method after the return is received and inspected. Processing times may vary by payment provider.",
  ].join(" ")
}

export function buildCancellationPolicyText(presets: StorePolicyPresetFields): string {
  const timing = labelFor(CANCELLATION_TIMING_OPTIONS, presets.cancellation_timing, "Before production starts")

  return [
    `Orders may be cancelled ${timing.toLowerCase()}.`,
    "Once production or fulfillment has started, cancellation may no longer be available.",
    "If payment was captured, approved cancellations are refunded according to the payment provider timeline shown in your order details.",
  ].join(" ")
}

export function buildPaymentPolicyText(presets: StorePolicyPresetFields): string {
  if (presets.payment_preset === "stripe_standard") {
    return "This shop accepts major credit and debit cards plus Apple Pay and Google Pay where supported at checkout. Payment is processed securely through Stripe. Available methods for your cart are shown before you place the order."
  }
  return "Payment methods available for your cart are shown during checkout."
}

export function buildPrivacyPolicyText(presets: StorePolicyPresetFields, brandName?: string): string {
  const shop = brandName?.trim() || "This shop"
  if (presets.privacy_preset === "platform_standard") {
    return `${shop} operates on this marketplace platform. Order, delivery, and account data needed to fulfill your purchase is processed according to the platform Privacy Policy. The seller may use your contact details only to support orders placed with this shop.`
  }
  return `${shop} handles buyer information according to the platform Privacy Policy and applicable law.`
}

export function buildStorePolicyTexts(
  presets: StorePolicyPresetFields,
  brandName?: string
): {
  shipping_policy: string
  payment_policy: string
  returns_policy: string
  cancellation_policy: string
  privacy_policy: string
} {
  const merged = { ...DEFAULT_STORE_POLICY_PRESETS, ...presets }
  return {
    shipping_policy: buildShippingPolicyText(merged),
    payment_policy: buildPaymentPolicyText(merged),
    returns_policy: buildReturnsPolicyText(merged),
    cancellation_policy: buildCancellationPolicyText(merged),
    privacy_policy: buildPrivacyPolicyText(merged, brandName),
  }
}

export function resolveStorePolicyDisplay(metadata: Record<string, unknown> | null | undefined, brandName?: string) {
  const presets = readStorePolicyPresets(metadata)
  const hasPresets = Object.keys(presets).length > 0
  const generated = hasPresets ? buildStorePolicyTexts(presets, brandName) : null

  const legacy = (key: string) => {
    const value = metadata?.[key]
    return typeof value === "string" && value.trim() ? value.trim() : undefined
  }

  return {
    shippingPolicy: generated?.shipping_policy ?? legacy("shipping_policy"),
    paymentPolicy: generated?.payment_policy ?? legacy("payment_policy"),
    returnsPolicy: generated?.returns_policy ?? legacy("returns_policy"),
    cancellationPolicy: generated?.cancellation_policy ?? legacy("cancellation_policy"),
    privacyPolicy: generated?.privacy_policy ?? legacy("privacy_policy"),
  }
}
