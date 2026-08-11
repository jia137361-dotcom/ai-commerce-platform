import {
  buildCancellationPolicyText,
  buildPaymentPolicyText,
  buildPrivacyPolicyText,
  buildReturnsPolicyText,
  buildShippingPolicyText,
  CANCELLATION_TIMING_OPTIONS,
  DEFAULT_STORE_POLICY_PRESETS,
  PAYMENT_PRESET_OPTIONS,
  PRIVACY_PRESET_OPTIONS,
  RETURNS_CONDITION_OPTIONS,
  RETURNS_SHIPPING_OPTIONS,
  RETURNS_WINDOW_OPTIONS,
  SHIPPING_CUSTOMS_OPTIONS,
  SHIPPING_INTERNATIONAL_OPTIONS,
  SHIPPING_PROCESSING_OPTIONS,
  type PolicyOption,
  type StorePolicyPresetFields,
} from "@ai-commerce/shared-types"
import { Label, Select } from "../components/ui/Input"

export function PolicyPresetField({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string
  value: string
  options: PolicyOption[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const selected = options.find((option) => option.value === value)
  return (
    <>
      <Label>{label}</Label>
      <div className="space-y-2">
        <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {selected?.description ? <p className="text-xs leading-relaxed text-slate-500">{selected.description}</p> : null}
      </div>
    </>
  )
}

export function StorePolicyPresetsSection({
  presets,
  brandName,
  onChange,
}: {
  presets: StorePolicyPresetFields
  brandName: string
  onChange: (next: StorePolicyPresetFields) => void
}) {
  const merged = { ...DEFAULT_STORE_POLICY_PRESETS, ...presets }
  const patch = (key: keyof StorePolicyPresetFields, value: string) => onChange({ ...merged, [key]: value })

  const previews = {
    shipping: buildShippingPolicyText(merged),
    payment: buildPaymentPolicyText(merged),
    returns: buildReturnsPolicyText(merged),
    cancellation: buildCancellationPolicyText(merged),
    privacy: buildPrivacyPolicyText(merged, brandName),
  }

  return (
    <>
      <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <strong className="text-slate-900">Store policies</strong>
        <p className="mt-1">
          Choose standard options like Shopify or Etsy instead of writing legal text from scratch. Buyers see the generated policy summary on your shop page.
        </p>
      </div>

      <PolicyPresetField label="Processing time" value={merged.shipping_processing} options={SHIPPING_PROCESSING_OPTIONS} onChange={(value) => patch("shipping_processing", value)} />
      <PolicyPresetField label="International shipping" value={merged.shipping_international} options={SHIPPING_INTERNATIONAL_OPTIONS} onChange={(value) => patch("shipping_international", value)} />
      <PolicyPresetField label="Import duties & taxes" value={merged.shipping_customs} options={SHIPPING_CUSTOMS_OPTIONS} onChange={(value) => patch("shipping_customs", value)} />

      <div className="sm:col-span-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
        <strong className="text-slate-800">Shipping preview:</strong> {previews.shipping}
      </div>

      <PolicyPresetField label="Return window" value={merged.returns_window} options={RETURNS_WINDOW_OPTIONS} onChange={(value) => patch("returns_window", value)} />
      <PolicyPresetField label="Return shipping" value={merged.returns_shipping} options={RETURNS_SHIPPING_OPTIONS} onChange={(value) => patch("returns_shipping", value)} />
      <PolicyPresetField label="Return condition" value={merged.returns_condition} options={RETURNS_CONDITION_OPTIONS} onChange={(value) => patch("returns_condition", value)} />

      <div className="sm:col-span-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
        <strong className="text-slate-800">Returns preview:</strong> {previews.returns}
      </div>

      <PolicyPresetField label="Cancellation window" value={merged.cancellation_timing} options={CANCELLATION_TIMING_OPTIONS} onChange={(value) => patch("cancellation_timing", value)} />

      <div className="sm:col-span-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
        <strong className="text-slate-800">Cancellation preview:</strong> {previews.cancellation}
      </div>

      <PolicyPresetField label="Payment methods" value={merged.payment_preset} options={PAYMENT_PRESET_OPTIONS} onChange={(value) => patch("payment_preset", value)} disabled />
      <PolicyPresetField label="Privacy policy" value={merged.privacy_preset} options={PRIVACY_PRESET_OPTIONS} onChange={(value) => patch("privacy_preset", value)} disabled />

      <div className="sm:col-span-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
        <strong className="text-slate-800">Payment preview:</strong> {previews.payment}
      </div>
      <div className="sm:col-span-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
        <strong className="text-slate-800">Privacy preview:</strong> {previews.privacy}
      </div>
    </>
  )
}
