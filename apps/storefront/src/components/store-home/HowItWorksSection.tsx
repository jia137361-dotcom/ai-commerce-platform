import { useBuyerLocale } from "../../lib/locale"

type HowItWorksSectionProps = {
  studioHref?: string
}

export function HowItWorksSection({ studioHref = "/trends" }: HowItWorksSectionProps) {
  const { t } = useBuyerLocale()

  return (
    <section className="buyer-how-it-works" id="how-it-works" aria-labelledby="how-it-works-title">
      <header className="buyer-how-it-works-header">
        <p className="buyer-how-it-works-eyebrow">{t("howItWorksEyebrow")}</p>
        <h2 id="how-it-works-title">{t("howItWorksTitle")}</h2>
      </header>
      <ol className="buyer-how-it-works-steps">
        <li>
          <span className="buyer-how-it-works-step-num" aria-hidden="true">
            1
          </span>
          <div>
            <h3>{t("howItWorksStep1Title")}</h3>
            <p>{t("howItWorksStep1Body")}</p>
          </div>
        </li>
        <li>
          <span className="buyer-how-it-works-step-num" aria-hidden="true">
            2
          </span>
          <div>
            <h3>{t("howItWorksStep2Title")}</h3>
            <p>{t("howItWorksStep2Body")}</p>
          </div>
        </li>
        <li>
          <span className="buyer-how-it-works-step-num" aria-hidden="true">
            3
          </span>
          <div>
            <h3>{t("howItWorksStep3Title")}</h3>
            <p>{t("howItWorksStep3Body")}</p>
          </div>
        </li>
      </ol>
      <a className="buyer-ui-button buyer-ui-button--primary" href={studioHref}>
        {t("howItWorksCta")}
      </a>
    </section>
  )
}
