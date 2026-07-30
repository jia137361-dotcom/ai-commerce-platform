import { useBuyerAuth } from "../../auth/useBuyerAuth"
import type { BuyerStoreSettings } from "../../lib/buyer-api"
import { useStoreFollow } from "../../hooks/useStoreFollow"
import { useBuyerLocale } from "../../lib/locale"
import { buildShareChannels, buildShareText } from "../../lib/share-channels"
import { buildStoreMessagesHref } from "../../lib/storefront-links"
import { ShareChannelsPanel } from "../share/ShareChannelsPanel"
import { Button } from "../ui/Button"
import { useMemo, useState } from "react"

export function StoreIdentity({ settings }: { settings: BuyerStoreSettings }) {
  const { t } = useBuyerLocale()
  const auth = useBuyerAuth()
  const name = settings.brandName || "Store"
  const { following, followerCount, pending, toggleFollow } = useStoreFollow(
    settings.storeId,
    settings.followerCount ?? 0
  )
  const [shareOpen, setShareOpen] = useState(false)
  const messagesHref = buildStoreMessagesHref(settings.storeId)
  const sharePayload = useMemo(() => {
    const pageUrl = window.location.href
    return {
      pageUrl,
      shareText: buildShareText(name, pageUrl),
      channels: buildShareChannels({
        pageUrl,
        title: name,
        imageUrl: settings.logoUrl,
      }),
    }
  }, [name, settings.logoUrl])

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
        <div className="buyer-shop-share-wrap">
          <Button
            variant="ghost"
            onClick={() => setShareOpen((open) => !open)}
            ariaLabel="Share store"
            aria-expanded={shareOpen}
          >
            ↗ Share
          </Button>
          {shareOpen ? (
            <div className="buyer-shop-share-popover">
              <ShareChannelsPanel
                compact
                heading="Share this store"
                title={name}
                pageUrl={sharePayload.pageUrl}
                shareText={sharePayload.shareText}
                channels={sharePayload.channels}
              />
            </div>
          ) : null}
        </div>
        <Button
          variant={following ? "primary" : "secondary"}
          type="button"
          disabled={pending}
          onClick={() => void toggleFollow()}
        >
          {following ? t("following") : t("follow")}
        </Button>
        <Button
          variant="secondary"
          href={auth.customer ? messagesHref : `/account/sign-in?returnTo=${encodeURIComponent(messagesHref)}`}
        >
          {t("message")}
        </Button>
      </div>
    </section>
  )
}
