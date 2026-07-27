import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { useBuyerLocale } from "../../lib/locale"
import { readBrowseHistory } from "../../lib/buyer-browse-history"

type AccountHoverPanelProps = {
  onClose?: () => void
}

export function AccountHoverPanel({ onClose }: AccountHoverPanelProps) {
  const auth = useBuyerAuth()
  const { t } = useBuyerLocale()
  const signInHref = "/account/sign-in"
  const history = readBrowseHistory()

  return (
    <div className="buyer-account-panel buyer-account-panel--mega" role="menu">
      <section className="buyer-account-panel-history">
        <header>
          <a href="/store">Browsing history</a>
        </header>
        {history.length ? (
          <ul>
            {history.slice(0, 4).map((item) => (
              <li key={item.id}>
                <a href={item.href} onClick={onClose}>
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="buyer-account-panel-thumb" />}
                  <div>
                    <strong>{item.title}</strong>
                    {item.price != null ? <span>${item.price.toFixed(2)}</span> : null}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="buyer-account-panel-empty">No browsing history yet.</p>
        )}
      </section>
      <section className="buyer-account-panel-links">
        <a href="/ai-design" onClick={onClose}>
          AI design
        </a>
        <a href="/saved" onClick={onClose}>
          My Saved
        </a>
        <a href="/account/orders" onClick={onClose}>
          {t("navOrders")}
        </a>
        <a href="/account/addresses" onClick={onClose}>
          Addresses
        </a>
        <a href="/account" onClick={onClose}>
          Account security
        </a>
        <a href="/help" onClick={onClose}>
          Notifications
        </a>
        {auth.customer ? (
          <a href="/account" onClick={onClose}>
            {t("navMe")}
          </a>
        ) : (
          <a href={signInHref} onClick={onClose}>
            {t("signIn")}
          </a>
        )}
      </section>
    </div>
  )
}
