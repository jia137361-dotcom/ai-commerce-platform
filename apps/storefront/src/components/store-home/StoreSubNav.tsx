import { useBuyerLocale } from "../../lib/locale"

type StoreSubNavProps = {
  className?: string
}

/** Shared main shortcuts — same on desktop and mobile top chrome. */
export function StoreSubNav({ className }: StoreSubNavProps) {
  const { t } = useBuyerLocale()

  return (
    <nav className={["buyer-store-subnav", className].filter(Boolean).join(" ")} aria-label="Main navigation">
      <a href="/store">Shop</a>
      <a href="/trends">Trends</a>
      <a href="/ai-design">{t("navAiDesign")}</a>
      <a href="/studio">{t("navStudio")}</a>
      <a href="/store#how-it-works">{t("navHowItWorks")}</a>
      <a href="/saved">Saved</a>
      <a href="/search">Search</a>
    </nav>
  )
}
