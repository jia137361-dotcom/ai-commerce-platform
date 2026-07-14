import { useBuyerLocale } from "../../lib/locale"

type ShopHeroProps = {
  brandName: string
  imageUrl?: string
  isFallback?: boolean
  announcement?: string
  description?: string
  studioHref?: string
}

export function ShopHero({
  brandName,
  imageUrl,
  isFallback = false,
  announcement,
  description,
  studioHref = "/studio",
}: ShopHeroProps) {
  const { t } = useBuyerLocale()
  const backgroundImage = imageUrl
    ? `linear-gradient(105deg, rgba(12, 12, 12, .72) 0%, rgba(12, 12, 12, .28) 55%, rgba(12, 12, 12, .08) 100%), url("${imageUrl.replace(/["\\]/g, "")}")`
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
          <a className="buyer-ui-button buyer-ui-button--ghost" href="/store#products">
            {t("heroCtaShop")}
          </a>
        </div>
      </div>
    </section>
  )
}
