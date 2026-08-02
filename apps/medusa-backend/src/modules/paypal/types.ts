export type PayPalEnvironment = "sandbox"

export type PayPalProviderOptions = {
  clientId: string
  clientSecret: string
  environment: PayPalEnvironment
  webhookId?: string
  brandName?: string
  returnUrl?: string
  cancelUrl?: string
}

export type PayPalOrder = {
  id: string
  status?: string
  intent?: string
  purchase_units?: Array<{
    reference_id?: string
    custom_id?: string
    amount?: { currency_code?: string; value?: string }
    payments?: {
      captures?: Array<{
        id?: string
        status?: string
        amount?: { currency_code?: string; value?: string }
        seller_protection?: Record<string, unknown>
      }>
    }
  }>
  links?: Array<{ href?: string; rel?: string; method?: string }>
}

export type PayPalRefund = {
  id?: string
  status?: string
  amount?: { currency_code?: string; value?: string }
  links?: Array<{ href?: string; rel?: string; method?: string }>
}

export type PayPalWebhookEvent = {
  id?: string
  event_type?: string
  resource?: Record<string, unknown>
  create_time?: string
}
