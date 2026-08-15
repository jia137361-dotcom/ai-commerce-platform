import { useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { MoneyText } from "../../components/ui/MoneyText"
import { ErrorState } from "../../components/ui/States"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import {
  isPlatformCheckoutComplete,
  nextPendingPlatformCheckoutGroup,
  readPlatformCheckoutSession,
  type PlatformCheckoutSession,
} from "../../lib/platform-checkout-session"

type PlatformCheckoutPageProps = {
  cartCount: number
}

const buildStoreCheckoutHref = (group: PlatformCheckoutSession["groups"][number], session: PlatformCheckoutSession) => {
  const params = new URLSearchParams({
    store: group.store_id,
    cart_id: group.cart_id,
    platform_checkout_id: session.platform_checkout_id,
    platform_checkout_index: String(group.platform_checkout_index),
    platform_checkout_count: String(group.platform_checkout_count),
  })
  return `/checkout?${params.toString()}`
}

export function PlatformCheckoutPage({ cartCount }: PlatformCheckoutPageProps) {
  const { settings } = useBuyerPageSettings()
  const [session] = useState(() => readPlatformCheckoutSession())

  const pendingGroup = useMemo(() => nextPendingPlatformCheckoutGroup(session), [session])

  if (!session) {
    return (
      <PageShell
        className="buyer-checkout-page buyer-platform-checkout-page"
        contentClassName="buyer-checkout-shell-content"
        header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode />}
        footer={<StoreFooter />}
        cartCount={cartCount}
      >
        <ErrorState
          title="No platform checkout session"
          message="Start merged checkout from your cart to review all store orders together."
          action={{ label: "Back to cart", onClick: () => window.location.assign("/cart") }}
        />
      </PageShell>
    )
  }

  const completedCount = session.completed_store_ids.length
  const totalGroups = session.groups.length
  const grandTotal = session.grand_total ?? session.groups.reduce((sum, group) => sum + (group.total ?? 0), 0)
  const currencyCode = session.currency_code ?? session.groups[0]?.currency_code ?? "usd"

  const allComplete = isPlatformCheckoutComplete(session)

  return (
    <PageShell
      className="buyer-checkout-page buyer-platform-checkout-page"
      contentClassName="buyer-checkout-shell-content"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode />}
      footer={<StoreFooter />}
      cartCount={cartCount}
    >
      <header className="buyer-checkout-page-header">
        <div>
          <p>Multi-store checkout</p>
          <h1>Platform checkout</h1>
          <span>
            {allComplete
              ? "All store orders are placed."
              : `Step ${completedCount + 1} of ${totalGroups} · one payment per store`}
          </span>
        </div>
        <a href="/cart">Back to cart</a>
      </header>

      <Card as="section" className="buyer-platform-checkout-overview">
        <p className="buyer-platform-checkout-kicker">Checkout batch</p>
        <h2>{session.platform_checkout_id}</h2>
        <p className="buyer-platform-checkout-copy">
          Each store completes its own payment and order. Your address can be reused as you move through each store checkout.
        </p>
        <dl className="buyer-platform-checkout-totals">
          <div>
            <dt>Stores</dt>
            <dd>{totalGroups}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{completedCount}</dd>
          </div>
          <div>
            <dt>Estimated total</dt>
            <dd>
              <MoneyText amount={grandTotal} currencyCode={currencyCode} />
            </dd>
          </div>
        </dl>
      </Card>

      <section className="buyer-platform-checkout-groups" aria-label="Store checkout groups">
        {session.groups.map((group) => {
          const completed = session.completed_store_ids.includes(group.store_id)
          return (
            <Card key={group.store_id} as="article" className="buyer-platform-checkout-group-card">
              <header>
                <div>
                  <p>Store {group.platform_checkout_index + 1}</p>
                  <h3>{group.store_name}</h3>
                </div>
                <span>{completed ? "Completed" : pendingGroup?.store_id === group.store_id ? "Next" : "Pending"}</span>
              </header>
              <p>
                <MoneyText amount={group.total ?? group.subtotal} currencyCode={group.currency_code ?? currencyCode} />
                {" · "}checkout separately
              </p>
              {!completed && pendingGroup?.store_id === group.store_id ? (
                <Button href={buildStoreCheckoutHref(group, session)}>
                  {completedCount === 0 ? "Start checkout" : `Pay ${group.store_name}`}
                </Button>
              ) : completed ? (
                <Button variant="secondary" href="/account/orders">
                  View orders
                </Button>
              ) : null}
            </Card>
          )
        })}
      </section>

      {allComplete ? (
        <div className="buyer-platform-checkout-actions">
          <Button href="/account/orders">View all orders</Button>
          <Button variant="ghost" href="/">
            Continue shopping
          </Button>
        </div>
      ) : pendingGroup ? (
        <div className="buyer-platform-checkout-actions">
          <Button href={buildStoreCheckoutHref(pendingGroup, session)}>
            {completedCount === 0 ? "Continue to first store checkout" : "Continue next store checkout"}
          </Button>
        </div>
      ) : null}
    </PageShell>
  )
}
