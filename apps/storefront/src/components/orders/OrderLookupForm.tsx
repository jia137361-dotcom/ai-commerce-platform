import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

type OrderLookupFormProps = {
  email: string
  displayId: string
  loading: boolean
  error?: string
  onEmailChange: (value: string) => void
  onDisplayIdChange: (value: string) => void
  onSubmit: () => void
}

export function OrderLookupForm({
  email,
  displayId,
  loading,
  error,
  onEmailChange,
  onDisplayIdChange,
  onSubmit,
}: OrderLookupFormProps) {
  return (
    <Card as="section" className="buyer-order-card buyer-order-lookup-card">
      <div>
        <p className="buyer-order-kicker">Guest order lookup</p>
        <h1>Find your order</h1>
        <p>Enter the email used at checkout and the order display id.</p>
      </div>
      {error && <p className="buyer-order-error">{error}</p>}
      <form
        className="buyer-order-lookup-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <label className="buyer-order-field">
          <span>Email</span>
          <input
            autoComplete="email"
            inputMode="email"
            placeholder="buyer@example.com"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
          />
        </label>
        <label className="buyer-order-field">
          <span>Order display id</span>
          <input
            inputMode="numeric"
            placeholder="62"
            value={displayId}
            onChange={(event) => onDisplayIdChange(event.target.value)}
          />
        </label>
        <Button type="submit" loading={loading}>
          {loading ? "Searching..." : "Find order"}
        </Button>
      </form>
    </Card>
  )
}
