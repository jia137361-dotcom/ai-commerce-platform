import { useEffect, useRef, useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { claimBuyerReferralCode, completeBuyerGoogleCallback } from "../../lib/buyer-api"
import {
  acquireGoogleCallbackLock,
  clearBuyerGoogleAuthContext,
  completeGoogleCallbackLock,
  readBuyerGoogleAuthContext,
  releaseGoogleCallbackLock,
} from "../../lib/buyer-google-auth"
import { Card } from "../../components/ui/Card"
import { ErrorState } from "../../components/ui/States"

export function GoogleAuthCallbackPage({ cartCount }: { cartCount: number }) {
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const [error, setError] = useState<string>()
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let active = true
    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      if (params.get("error")) {
        const description = params.get("error_description") || "Google sign-in was cancelled."
        if (active) setError(description)
        clearBuyerGoogleAuthContext()
        return
      }
      const code = params.get("code")
      const state = params.get("state")
      if (!code || !state) {
        if (active) setError("Google sign-in did not return a valid authorization code.")
        clearBuyerGoogleAuthContext()
        return
      }

      if (!acquireGoogleCallbackLock(code)) {
        // StrictMode remount or duplicate tab — first run owns the code exchange.
        return
      }

      const context = readBuyerGoogleAuthContext()
      try {
        const query: Record<string, string> = {}
        params.forEach((value, key) => {
          query[key] = value
        })
        await completeBuyerGoogleCallback({
          query,
          rememberMe: context.rememberMe,
        })
        if (context.referralCode) {
          await claimBuyerReferralCode(context.referralCode, "link")
        }
        completeGoogleCallbackLock(code)
        clearBuyerGoogleAuthContext()
        window.location.assign(context.returnTo || "/account")
      } catch (callbackError) {
        releaseGoogleCallbackLock(code)
        clearBuyerGoogleAuthContext()
        if (active) {
          setError(callbackError instanceof Error ? callbackError.message : "Unable to finish Google sign-in.")
        }
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [])

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>
      <div className="buyer-account-auth-shell">
        <section className="buyer-account-auth-intro">
          <p>Buyer account</p>
          <h1>Signing you in</h1>
          <span>Finishing Google authentication for your CiiVerse account.</span>
        </section>
        <Card as="section" className="buyer-account-auth-card">
          <div className="buyer-auth-card">
            {error ? (
              <>
                <ErrorState title="Google sign-in failed" message={error} />
                <p className="buyer-auth-hint">
                  <a href="/account/sign-in">Back to sign in</a>
                </p>
              </>
            ) : (
              <p className="buyer-auth-hint">Please wait while we complete your sign-in.</p>
            )}
          </div>
        </Card>
      </div>
    </AccountAuthLayout>
  )
}
