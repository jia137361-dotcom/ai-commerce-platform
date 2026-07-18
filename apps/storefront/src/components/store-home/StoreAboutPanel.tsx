import { useState } from "react"
import type { BuyerStoreSettings } from "../../lib/buyer-api"

export type StoreInformationSection =
  | "shop-info"
  | "shipping"
  | "payment"
  | "returns"
  | "cancellations"
  | "privacy"

const navigation: Array<{ id: StoreInformationSection; label: string; icon: string }> = [
  { id: "shop-info", label: "Shop info", icon: "⌂" },
  { id: "shipping", label: "Shipping", icon: "▱" },
  { id: "payment", label: "Payment", icon: "▣" },
  { id: "returns", label: "Returns & exchanges", icon: "↩" },
  { id: "cancellations", label: "Cancellations", icon: "×" },
  { id: "privacy", label: "Privacy Policy", icon: "◇" },
]

function ShopInfo({ settings }: { settings: BuyerStoreSettings }) {
  return (
    <div className="buyer-shop-information-stack">
      <article className="buyer-shop-information-card">
        <p className="buyer-shop-information-eyebrow">About the shop</p>
        <h2>{settings.brandName}</h2>
        <p>{settings.description ?? "This seller has not added an about description yet."}</p>
      </article>

      {settings.announcement ? (
        <article className="buyer-shop-information-card buyer-shop-announcement-card">
          <p className="buyer-shop-information-eyebrow">Shop announcement</p>
          <h2>Latest from the seller</h2>
          <p>{settings.announcement}</p>
        </article>
      ) : null}
    </div>
  )
}

export function StoreInformationContent({ section, settings }: { section: StoreInformationSection; settings: BuyerStoreSettings }) {
  if (section === "shop-info") return <ShopInfo settings={settings} />

  if (section === "shipping") return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Information & policies</p>
      <h2>Shipping</h2>
      <p>{settings.shippingPolicy ?? "Not provided by this seller."}</p>
      <p className="buyer-shop-policy-note">Available shipping methods and prices are calculated from your delivery address during checkout.</p>
    </article>
  )

  if (section === "payment") return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Information & policies</p>
      <h2>Payment</h2>
      <p>{settings.paymentPolicy ?? "Not provided by this seller."}</p>
      <p className="buyer-shop-policy-note">Payment methods supported for your cart are displayed during checkout.</p>
    </article>
  )

  if (section === "returns") return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Information & policies</p>
      <h2>Returns &amp; exchanges</h2>
      <p>{settings.returnsPolicy ?? "Not provided by this seller."}</p>
      <p className="buyer-shop-policy-note">Online return and exchange workflows are not available in the buyer portal yet.</p>
    </article>
  )

  if (section === "cancellations") return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Information & policies</p>
      <h2>Cancellations</h2>
      <p>{settings.cancellationPolicy ?? "Not provided by this seller."}</p>
      <p className="buyer-shop-policy-note">Cancellation availability still depends on the current payment and fulfillment state shown in order details.</p>
    </article>
  )

  return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Information & policies</p>
      <h2>Privacy Policy</h2>
      <p>{settings.privacyPolicy ?? "Not provided by this seller."}</p>
      <p className="buyer-shop-policy-note">Read the platform <a href="/privacy">Privacy Policy</a> for platform-level information.</p>
    </article>
  )
}

export function StoreAboutPanel({ settings }: { settings: BuyerStoreSettings }) {
  const [activeSection, setActiveSection] = useState<StoreInformationSection>("shop-info")

  return (
    <section className="buyer-shop-about" id="about" aria-label="About this shop">
      <aside className="buyer-shop-information-sidebar">
        <div className="buyer-shop-information-heading">
          <p>Shop navigation</p>
          <h2>Information &amp; Policies</h2>
        </div>
        <nav aria-label="Store information sections">
          {navigation.map((item, index) => (
            <button
              className={activeSection === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>{item.label}
              {index > 2 && item.id !== "privacy" ? <small>Limited</small> : null}
            </button>
          ))}
        </nav>

        <div className="buyer-shop-support-card">
          <span aria-hidden="true">?</span>
          <h3>Customer support</h3>
          {settings.supportEmail ? <a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a> : <p>Seller support email unavailable.</p>}
          <a className="buyer-shop-support-action" href="/account/messages">Message the seller</a>
          <small>Signed-in buyers can chat with the store team about orders and products.</small>
        </div>
      </aside>

      <div className="buyer-shop-information-content">
        <StoreInformationContent section={activeSection} settings={settings} />
      </div>
    </section>
  )
}
