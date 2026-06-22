import type { BuyerStoreSettings } from "../../lib/buyer-api"
import { useStoreFollow } from "../../hooks/useStoreFollow"
import { useBuyerLocale } from "../../lib/locale"
import { Button } from "../ui/Button"
import { useState } from "react"

export function StoreIdentity({ settings }: { settings: BuyerStoreSettings }) {
  const { t } = useBuyerLocale()
  const name = settings.brandName || "Citigoo Official Store"
  const { following, followerCount, pending, toggleFollow } = useStoreFollow(
    settings.storeId,
    settings.followerCount ?? 0
  )
  const [shareStatus, setShareStatus] = useState("")
  const shareStore = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: name, url })
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); setShareStatus("Link copied") }
      else setShareStatus("Sharing unavailable")
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setShareStatus("Sharing unavailable")
    }
  }

  return (
    <section className="buyer-shop-identity" aria-label="Store information">
      <div className="buyer-shop-identity-mark" aria-hidden="true">
        {settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <span>C</span>}
      </div>
      <div className="buyer-shop-identity-copy">
        <h1>{name}</h1>
        <p>
          {t("officialStore")}
          {followerCount > 0 ? ` · ${followerCount.toLocaleString()} followers` : ""}
        </p>
      </div>
      <div className="buyer-shop-identity-actions">
        <Button variant="ghost" onClick={() => void shareStore()} ariaLabel="Share store">↗ Share</Button>
        <Button
          variant={following ? "primary" : "secondary"}
          type="button"
          disabled={pending}
          onClick={() => void toggleFollow()}
        >
          {following ? t("following") : t("follow")}
        </Button>
        <Button variant="secondary" disabled title="Direct seller messaging is not available yet">{t("message")} · unavailable</Button>
      </div>
      {shareStatus ? <span className="buyer-shop-share-status" role="status">{shareStatus}</span> : null}
    </section>
  )
}
