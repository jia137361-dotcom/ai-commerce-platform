# Buyer Google OAuth — local checklist

## Prerequisites

1. Create a Google Cloud OAuth **Web** client.
2. Authorized redirect URI (must match storefront exactly):
   - Local: `http://127.0.0.1:5174/auth/google/callback`
   - Also add `http://localhost:5174/auth/google/callback` if you use that host.
3. Set on `apps/medusa-backend/.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALLBACK_URL=http://127.0.0.1:5174/auth/google/callback`
4. Set on storefront env:
   - `VITE_GOOGLE_AUTH_ENABLED=true`
5. Restart medusa-backend after env changes (auth providers load at boot).

## Manual cases

- [ ] Sign-in page shows **Continue with Google** when flag + backend credentials are set
- [ ] Button hidden when `VITE_GOOGLE_AUTH_ENABLED=false` or backend credentials missing
- [ ] First Google login creates Customer and session cookie; `/store/customers/me` works
- [ ] Existing password/OTP Gmail account merges (same email) and signs in
- [ ] Cancel on Google returns to callback with a safe error + link back to sign-in
- [ ] Non-allowlisted Google Workspace custom domain is rejected by `/store/auth/google/complete`
- [ ] Apple copy remains “coming soon”
- [ ] Password + OTP login still work without Google configured

## Seller extension (not in this phase)

- Reuse `resolveOAuthCallbackUrl("seller")` + `buildAuthIdentityActorMetadata({ actor: "seller" })`
- Separate Google redirect URI / dashboard callback page
