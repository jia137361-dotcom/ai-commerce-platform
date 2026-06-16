export function AccountAuthRequired() {
  return (
    <section className="buyer-account-card buyer-account-required">
      <h1>Sign in required</h1>
      <p>Your account area uses a secure customer session. Sign in to continue.</p>
      <div>
        <a href="/account/sign-in">Sign in</a>
        <a href="/account/register">Create account</a>
      </div>
    </section>
  )
}
