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
        <strong>CiiVerse</strong>
        <p>Defining modern commerce through curated products, reliable fulfillment, and protected checkout.</p>
      </div>
      <nav aria-label="Store footer">
        <a href="/store">Shopping</a>
        <a href="/orders/lookup">Order Tracking</a>
        <a href="/help">Help</a>
        <a href="/about">About</a>
        <a href="/store?tab=about">Shipping & Returns</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/cookies">Cookies</a>
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
