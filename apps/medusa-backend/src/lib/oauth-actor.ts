export type OAuthActor = "buyer" | "seller"

const trimEnv = (value: string | undefined) => value?.trim() || ""

const defaultStorefrontOrigin = () =>
  trimEnv(process.env.STOREFRONT_URL) ||
  trimEnv(process.env.STOREFRONT_BASE_URL) ||
  "http://127.0.0.1:5174"

const defaultSellerOrigin = () =>
  trimEnv(process.env.SELLER_DASHBOARD_URL) || "http://127.0.0.1:5173"

/** Resolve Google OAuth callback URL for an actor (buyer now, seller later). */
export function resolveOAuthCallbackUrl(
  actor: OAuthActor,
  provider: "google" = "google"
): string {
  if (provider !== "google") {
    throw new Error(`Unsupported OAuth provider: ${provider}`)
  }

  if (actor === "seller") {
    return (
      trimEnv(process.env.GOOGLE_SELLER_CALLBACK_URL) ||
      `${defaultSellerOrigin().replace(/\/$/, "")}/auth/google/callback`
    )
  }

  return (
    trimEnv(process.env.GOOGLE_BUYER_CALLBACK_URL) ||
    trimEnv(process.env.GOOGLE_CALLBACK_URL) ||
    `${defaultStorefrontOrigin().replace(/\/$/, "")}/auth/google/callback`
  )
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(trimEnv(process.env.GOOGLE_CLIENT_ID) && trimEnv(process.env.GOOGLE_CLIENT_SECRET))
}

export type LinkAuthIdentityToActorInput = {
  authIdentityId: string
  actor: OAuthActor
  actorId: string
  previousMetadata?: Record<string, unknown> | null
}

/** Build app_metadata patch that links an Auth Identity to a buyer or seller actor. */
export function buildAuthIdentityActorMetadata(
  input: LinkAuthIdentityToActorInput
): Record<string, unknown> {
  const previous =
    input.previousMetadata && typeof input.previousMetadata === "object"
      ? { ...input.previousMetadata }
      : {}

  if (input.actor === "seller") {
    return {
      ...previous,
      user_id: input.actorId,
    }
  }

  return {
    ...previous,
    customer_id: input.actorId,
  }
}
