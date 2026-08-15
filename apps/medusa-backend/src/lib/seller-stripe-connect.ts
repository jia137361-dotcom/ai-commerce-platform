import { isStripeConfigured, isStripeResourceNotFoundError, stripeApiRequest } from "./stripe-client"

export type StripeConnectAccount = {
  id: string
  country?: string | null
  charges_enabled?: boolean
  payouts_enabled?: boolean
  details_submitted?: boolean
  email?: string | null
  requirements?: {
    disabled_reason?: string | null
    currently_due?: string[] | null
  } | null
}

export type SellerStripeConnectStatus = {
  configured: boolean
  connected: boolean
  account_id?: string | null
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  onboarding_required: boolean
  dashboard_url?: string | null
  requirements_due?: string[]
  requirements_disabled_reason?: string | null
  account_country?: string | null
  platform_country?: string | null
  country_mismatch: boolean
  account_missing: boolean
  test_mode: boolean
}

const isStripeTestMode = () => process.env.STRIPE_API_KEY?.startsWith("sk_test_") ?? false

export const readSellerDashboardBaseUrl = () =>
  (process.env.SELLER_DASHBOARD_URL ?? "http://127.0.0.1:5173").replace(/\/+$/, "")

export const maskStripeAccountId = (accountId?: string | null) => {
  if (!accountId) return null
  if (accountId.length <= 8) return accountId
  return `${accountId.slice(0, 7)}…${accountId.slice(-4)}`
}

export const isConnectAccountReady = (account: StripeConnectAccount) =>
  Boolean(account.charges_enabled && account.payouts_enabled && account.details_submitted)

export async function retrieveConnectAccount(accountId: string) {
  return stripeApiRequest<StripeConnectAccount>(`/accounts/${accountId}`)
}

export async function createExpressConnectAccount(input: {
  storeId: string
  email?: string | null
  country?: string | null
}) {
  return stripeApiRequest<StripeConnectAccount>("/accounts", {
    method: "POST",
    params: {
      type: "express",
      country: input.country ?? process.env.STRIPE_CONNECT_COUNTRY ?? "US",
      email: input.email ?? undefined,
      "metadata[store_id]": input.storeId,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    },
  })
}

const normalizeCountry = (country?: string | null) => country?.trim().toUpperCase() || null

export const retrieveStripePlatformAccount = () =>
  stripeApiRequest<Pick<StripeConnectAccount, "id" | "country">>("/account")

export async function createConnectAccountLink(input: {
  accountId: string
  refreshUrl: string
  returnUrl: string
}) {
  return stripeApiRequest<{ url: string }>("/account_links", {
    method: "POST",
    params: {
      account: input.accountId,
      refresh_url: input.refreshUrl,
      return_url: input.returnUrl,
      type: "account_onboarding",
    },
  })
}

export async function createConnectLoginLink(accountId: string) {
  return stripeApiRequest<{ url: string }>(`/accounts/${accountId}/login_links`, {
    method: "POST",
  })
}

export async function resolveSellerStripeConnectStatus(
  stripeAccountId?: string | null
): Promise<SellerStripeConnectStatus> {
  if (!isStripeConfigured()) {
    return {
      configured: false,
      connected: false,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      onboarding_required: true,
      country_mismatch: false,
      account_missing: false,
      test_mode: isStripeTestMode(),
    }
  }

  if (!stripeAccountId) {
    return {
      configured: true,
      connected: false,
      account_id: null,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      onboarding_required: true,
      country_mismatch: false,
      account_missing: false,
      test_mode: isStripeTestMode(),
    }
  }

  let account: StripeConnectAccount
  try {
    account = await retrieveConnectAccount(stripeAccountId)
  } catch (error) {
    if (!isStripeResourceNotFoundError(error)) throw error
    let platformCountry: string | null = null
    try {
      platformCountry = normalizeCountry((await retrieveStripePlatformAccount()).country)
    } catch {
      // Rebinding remains possible even if the platform country lookup fails.
    }
    return {
      configured: true,
      connected: false,
      account_id: maskStripeAccountId(stripeAccountId),
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      onboarding_required: true,
      country_mismatch: false,
      account_missing: true,
      platform_country: platformCountry,
      test_mode: isStripeTestMode(),
    }
  }
  const accountCountry = normalizeCountry(account.country)
  let platformCountry: string | null = null
  try {
    platformCountry = normalizeCountry((await retrieveStripePlatformAccount()).country)
  } catch {
    // Account readiness remains useful if the platform account cannot be read.
  }
  const countryMismatch = Boolean(accountCountry && platformCountry && accountCountry !== platformCountry)
  const ready = isConnectAccountReady(account) && !countryMismatch
  let dashboardUrl: string | null = null
  if (ready) {
    try {
      const login = await createConnectLoginLink(stripeAccountId)
      dashboardUrl = login.url ?? null
    } catch {
      dashboardUrl = null
    }
  }

  return {
    configured: true,
    connected: ready,
    account_id: maskStripeAccountId(stripeAccountId),
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
    onboarding_required: !ready,
    dashboard_url: dashboardUrl,
    requirements_due: Array.isArray(account.requirements?.currently_due)
      ? account.requirements.currently_due
      : [],
    requirements_disabled_reason: account.requirements?.disabled_reason ?? null,
    account_country: accountCountry,
    platform_country: platformCountry,
    country_mismatch: countryMismatch,
    account_missing: false,
    test_mode: isStripeTestMode(),
  }
}

export const formatStripeConnectSetupError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Unable to start Stripe Connect onboarding"
  const normalized = message.toLowerCase()

  if (normalized.includes("signed up for connect")) {
    return "Stripe Connect is not enabled on the platform Stripe account. In the same Stripe account as STRIPE_API_KEY, first complete the platform account activation and Connect platform profile at https://dashboard.stripe.com/test/connect (test mode) or https://dashboard.stripe.com/connect (live mode), then retry."
  }

  if (normalized.includes("stripe_api_key is not configured")) {
    return "Stripe is not configured on the server (STRIPE_API_KEY)."
  }

  return message
}

export async function ensureSellerConnectOnboardingLink(input: {
  storeId: string
  stripeAccountId?: string | null
  supportEmail?: string | null
  country?: string | null
  persistAccountId?: (accountId: string) => Promise<void>
}) {
  let accountId = input.stripeAccountId ?? null
  if (!accountId) {
    const created = await createExpressConnectAccount({
      storeId: input.storeId,
      email: input.supportEmail,
      country: normalizeCountry(input.country),
    })
    accountId = created.id
    if (input.persistAccountId) {
      await input.persistAccountId(accountId)
    }
  }

  const base = readSellerDashboardBaseUrl()
  const link = await createConnectAccountLink({
    accountId,
    refreshUrl: `${base}/settings?stripe_connect=refresh`,
    returnUrl: `${base}/settings?stripe_connect=return`,
  })

  return {
    account_id: accountId,
    onboarding_url: link.url,
  }
}
