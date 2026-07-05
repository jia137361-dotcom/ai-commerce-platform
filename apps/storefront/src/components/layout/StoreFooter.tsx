import { FormEvent, useState } from "react"
import { subscribeNewsletter } from "../../lib/buyer-api"
import { useBuyerLocale } from "../../lib/locale"

export function StoreFooter() {
  const { t } = useBuyerLocale()
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState<string | undefined>()

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const value = email.trim()
    if (!value) return
    setStatus("loading")
    setMessage(undefined)
    try {
      const result = await subscribeNewsletter(value)
      setStatus("success")
      setMessage(result.message || t("newsletterSuccess"))
      setEmail("")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : t("newsletterError"))
    }
  }

  return (
    <footer className="store-footer">
      <div>
        <strong>Ciiverse</strong>
        <p>Citigoo Limited</p>
        <p>RM 1805, 18/F, Hollywood Plaza, 610 Nathan Road, Kowloon, Hong Kong</p>
        <p>© 2026 Citigoo Limited</p>
      </div>
      <nav aria-label="Information">
        <strong>Information</strong>
        <a href="/about-us">About Us</a>
        <a href="/policies">Policies</a>
      </nav>
      <nav aria-label="Customer Service">
        <strong>Customer Service</strong>
        <a href="/refund-and-replacement">Refund and Replacement</a>
        <a href="/help/shipping-information">Shipping Information</a>
        <a href="/help/payment-method">Payment Method</a>
        <a href="/help/order-status">Order Status</a>
      </nav>
      <nav aria-label="Help">
        <strong>Help</strong>
        <a href="/help">Help Center</a>
        <a href="/help/contact-us">Contact Us</a>
      </nav>
      <form className="newsletter-form" onSubmit={(event) => void onSubmit(event)}>
        <label htmlFor="newsletter-email">{t("newsletter")}</label>
        <div>
          <input
            id="newsletter-email"
            placeholder={t("newsletterPlaceholder")}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={status === "loading"}
          />
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "…" : t("newsletterJoin")}
          </button>
        </div>
        {message ? <p className="buyer-store-footer-note">{message}</p> : null}
      </form>
    </footer>
  )
}
