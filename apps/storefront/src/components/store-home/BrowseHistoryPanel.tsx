import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { readBrowseHistory } from "../../lib/buyer-browse-history"

type BrowseHistoryPanelProps = {
  onClose?: () => void
}

export function BrowseHistoryPanel({ onClose }: BrowseHistoryPanelProps) {
  const auth = useBuyerAuth()
  const history = readBrowseHistory({
    customerId: auth.customer?.id,
    email: auth.customer?.email,
  })

  return (
    <div className="buyer-account-panel buyer-account-panel--history" role="menu">
      <section className="buyer-account-panel-history">
        <header>
          <strong>Browsing history</strong>
          <span>{auth.customer ? "Saved for this account only" : "Saved on this device"}</span>
        </header>
        {history.length ? (
          <ul>
            {history.slice(0, 6).map((item) => (
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
          <p className="buyer-account-panel-empty">No browsing history for this account yet.</p>
        )}
      </section>
    </div>
  )
}
