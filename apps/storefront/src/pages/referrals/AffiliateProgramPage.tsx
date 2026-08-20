import { useEffect, useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { fetchReferralProgram, type BuyerReferralProgram } from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"

const fallbackProgram: BuyerReferralProgram = {
  name: "Customized Products",
  description: "Custom-print products with AI-powered design and mockup services.",
  first_order_rate_percent: 25,
  future_order_rate_percent: 8,
  future_order_months: 12,
  currency_code: "usd",
  minimum_payout: 5,
  payout_schedule: "monthly",
  eligible_amount_excludes: ["shipping", "tax", "import_fee", "export_fee", "coupon", "discount"],
}

export function AffiliateProgramPage({ cartCount, intro = false }: { cartCount: number; intro?: boolean }) {
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const [program, setProgram] = useState(fallbackProgram)

  useEffect(() => {
    void fetchReferralProgram().then(setProgram).catch(() => undefined)
  }, [])

  return (
    <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>
      <section className="buyer-affiliate-hero">
        <p className="buyer-affiliate-eyebrow">CiiVerse referral program</p>
        <h1>{intro ? "Earn by sharing AI custom-print products" : "Recommend products. Earn in USD."}</h1>
        <p>
          Invite friends using your personal link or referral code. Eligible commission is released to your
          CiiVerse wallet only after the order is successfully finished.
        </p>
      </section>

      <div className="buyer-affiliate-program-grid">
        <Card as="article" className="buyer-affiliate-program-card">
          <span className="buyer-affiliate-card-label">One simple program</span>
          <h2>{program.name}</h2>
          <p>{program.description}</p>
          <div className="buyer-affiliate-benefit">
            <span aria-hidden="true">✓</span>
            <div><strong>{program.first_order_rate_percent}% of first order</strong><p>A {program.first_order_rate_percent}% share of eligible product value on the buyer's first successful order.</p></div>
          </div>
          <div className="buyer-affiliate-benefit">
            <span aria-hidden="true">✓</span>
            <div><strong>{program.future_order_rate_percent}% of future orders</strong><p>A {program.future_order_rate_percent}% share of eligible purchases made over the next {program.future_order_months} months.</p></div>
          </div>
          <p className="buyer-affiliate-exclusion">Excludes shipping, taxes, import/export fees, coupons and discounts.</p>
          <Button href={intro ? "/account/referrals" : "/affiliates/customized-products"} fullWidth>
            {intro ? "Join now" : "Promote AI Custom-Print Products"}
          </Button>
        </Card>

        <aside className="buyer-affiliate-steps" aria-label="How referrals work">
          <h2>How it works</h2>
          <ol>
            <li><span>1</span><div><strong>Share</strong><p>Send your link or referral code by email, social media or QR code.</p></div></li>
            <li><span>2</span><div><strong>Track</strong><p>A paid purchase appears as Pending while the order is active.</p></div></li>
            <li><span>3</span><div><strong>Earn</strong><p>Order Successful releases commission to your USD wallet. Cancelled or refunded orders earn $0.</p></div></li>
            <li><span>4</span><div><strong>Withdraw</strong><p>Monthly payout schedule, with a minimum withdrawal of ${program.minimum_payout}.</p></div></li>
          </ol>
        </aside>
      </div>
    </AccountAuthLayout>
  )
}
