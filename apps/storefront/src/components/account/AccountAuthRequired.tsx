import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

export function AccountAuthRequired() {
  return (
    <Card as="section" className="buyer-account-required">
      <p className="buyer-account-kicker">Buyer account</p>
      <h1>Sign in required</h1>
      <p>Sign in to see your orders and profile, or create a buyer account to get started.</p>
      <div className="buyer-account-required-actions">
        <Button href="/account/sign-in">Sign in</Button>
        <Button href="/account/register" variant="secondary">Create account</Button>
      </div>
    </Card>
  )
}
