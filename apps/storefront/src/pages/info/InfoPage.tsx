import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { fetchStoreSettings, type BuyerStoreSettings } from "../../lib/buyer-api"
import { useEffect, useState, type ReactNode } from "react"

type InfoPageProps = {
  cartCount: number
  title: string
  children: ReactNode
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Citigoo Official Store",
  metadata: {},
}

export function InfoPage({ cartCount, title, children }: InfoPageProps) {
  const [settings, setSettings] = useState(fallbackSettings)

  useEffect(() => {
    void fetchStoreSettings().then((result) => setSettings(result.data))
  }, [])

  return (
    <PageShell
      className="buyer-info-page"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StoreFooter />}
    >
      <article className="buyer-info-card">
        <nav className="buyer-product-breadcrumb" aria-label="Breadcrumb">
          <a href="/store">Store</a>
          <span>/</span>
          <span>{title}</span>
        </nav>
        <h1>{title}</h1>
        <div className="buyer-info-body">{children}</div>
      </article>
    </PageShell>
  )
}

export function HelpPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Help Center">
      <p>Need help with an order, return, or account? Use the links below or email our support team.</p>
      <ul>
        <li><a href="/orders/lookup">Look up an order</a></li>
        <li><a href="/account/orders">Signed-in order history</a></li>
        <li><a href="/account/sign-in">Sign in to your account</a></li>
        <li><a href="mailto:support@citigoo.com">support@citigoo.com</a></li>
      </ul>
    </InfoPage>
  )
}

export function TermsPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Terms of Service">
      <p>
        By using this storefront you agree to purchase items for personal use, provide accurate shipping
        information at checkout, and comply with applicable local laws. Product images are illustrative;
        fulfillment partners produce the final item.
      </p>
      <p>Orders may be cancelled before production begins. Contact support for order changes.</p>
    </InfoPage>
  )
}

export function PrivacyPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Privacy Policy">
      <p>
        We collect account email, order contact details, and shipping addresses to fulfill purchases.
        Payment authorization is handled by the configured payment provider; card data is not stored on
        this demo storefront.
      </p>
      <p>For privacy requests, email <a href="mailto:privacy@citigoo.com">privacy@citigoo.com</a>.</p>
    </InfoPage>
  )
}
