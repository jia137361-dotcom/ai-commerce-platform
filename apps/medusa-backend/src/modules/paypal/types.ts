export type PayPalEnvironment = "sandbox"

export type PayPalProviderOptions = {
  clientId: string
  clientSecret: string
  environment: PayPalEnvironment
  merchantId?: string
  webhookId?: string
  brandName?: string
  returnUrl?: string
  cancelUrl?: string
}

export type PayPalOrder = {
  id: string
  status?: string
  intent?: string
  payer?: {
    payer_id?: string
    email_address?: string
  }
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

export type PayPalVaultSetupToken = {
  id?: string
  status?: string
  customer?: {
    id?: string
  }
  links?: Array<{ href?: string; rel?: string; method?: string }>
}

export type PayPalUserIdToken = {
  access_token?: string
  id_token?: string
  expires_in?: number
}

export type PayPalVaultPaymentToken = {
  id?: string
  payment_source?: {
    paypal?: {
      email_address?: string
      payer_id?: string
      name?: { given_name?: string; surname?: string }
    }
  }
}

export type PayPalWebhookEvent = {
  id?: string
  event_type?: string
  resource?: Record<string, unknown>
  create_time?: string
}
