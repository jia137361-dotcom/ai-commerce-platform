import { useBuyerLocale } from "../../lib/locale"

type StoreSubNavProps = {
  className?: string
  storeHref?: string
}

/** Shared main shortcuts — same on desktop and mobile top chrome. */
export function StoreSubNav({ className, storeHref = "/marketplace" }: StoreSubNavProps) {
  const { t } = useBuyerLocale()
  const howItWorksHref = `${storeHref}${storeHref.includes("?") ? "&" : "?"}section=how-it-works`

  return (
    <nav className={["buyer-store-subnav", className].filter(Boolean).join(" ")} aria-label="Main navigation">
      <a href={storeHref}>Shop</a>
      <a href="/ai-design">{t("navAiDesign")}</a>
      <a href={howItWorksHref}>{t("navHowItWorks")}</a>
      <a href="/my-designs">My Designs</a>
    </nav>
  )
}
