import type { BuyerStoreSettings } from "../../lib/buyer-api"
import { useStoreFollow } from "../../hooks/useStoreFollow"
import { useBuyerLocale } from "../../lib/locale"
import { Button } from "../ui/Button"

export function StoreIdentity({ settings }: { settings: BuyerStoreSettings }) {
  const { t } = useBuyerLocale()
  const name = settings.brandName || "Citigoo Official Store"
  const { following, followerCount, pending, toggleFollow } = useStoreFollow(
    settings.storeId,
    settings.followerCount ?? 0
  )

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
        <Button
          variant={following ? "primary" : "secondary"}
          type="button"
          disabled={pending}
          onClick={() => void toggleFollow()}
        >
          {following ? t("following") : t("follow")}
        </Button>
        <Button href="/help">{t("message")}</Button>
      </div>
    </section>
  )
}
