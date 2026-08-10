import { useBuyerLocale } from "../../lib/locale"

type ShopHeroProps = {
  brandName: string
  imageUrl?: string
  isFallback?: boolean
  announcement?: string
  description?: string
  studioHref?: string
  shopHref?: string
}

export function ShopHero({
  brandName,
  imageUrl,
  isFallback = false,
  announcement,
  description,
  studioHref = "/trends",
  shopHref = "/marketplace",
}: ShopHeroProps) {
  const { t } = useBuyerLocale()
  const backgroundImage = imageUrl
    ? `linear-gradient(90deg, rgba(255, 250, 237, .96) 0%, rgba(255, 250, 237, .78) 38%, rgba(255, 250, 237, .08) 68%), url("${imageUrl.replace(/["\\]/g, "")}")`
    : undefined

  return (
    <section
      className={["buyer-store-hero", "buyer-store-hero--indie", imageUrl ? "has-image" : ""].filter(Boolean).join(" ")}
      aria-label={`${brandName} store`}
      style={{ backgroundImage }}
    >
      <div className="buyer-store-hero-copy">
        {isFallback ? <span className="buyer-store-hero-fallback">Add a store banner in seller settings</span> : null}
        <p className="buyer-store-hero-kicker">{announcement ?? t("heroKicker")}</p>
        <h1>
          {brandName}
          <span className="buyer-store-hero-title-suffix"> {t("heroTitleSuffix")}</span>
        </h1>
        <span>{description ?? t("heroDescription")}</span>
        <div className="buyer-store-hero-actions">
          <a className="buyer-ui-button buyer-ui-button--primary" href={studioHref}>
            {t("heroCtaStudio")}
          </a>
          <a className="buyer-ui-button buyer-ui-button--ghost" href={shopHref}>
            {t("heroCtaShop")}
          </a>
        </div>
      </div>
    </section>
  )
}
