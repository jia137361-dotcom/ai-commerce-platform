import { useState } from "react"
import type { BuyerStoreSettings } from "../../lib/buyer-api"

export type StoreInformationSection =
  | "shop-info"
  | "shipping"
  | "payment"
  | "returns"
  | "cancellations"
  | "faqs"
  | "privacy"

const navigation: Array<{ id: StoreInformationSection; label: string; icon: string }> = [
  { id: "shop-info", label: "Shop info", icon: "⌂" },
  { id: "shipping", label: "Shipping", icon: "▱" },
  { id: "payment", label: "Payment", icon: "▣" },
  { id: "returns", label: "Returns & exchanges", icon: "↩" },
  { id: "cancellations", label: "Cancellations", icon: "×" },
  { id: "faqs", label: "FAQs", icon: "?" },
  { id: "privacy", label: "Privacy Policy", icon: "◇" },
]

export function normalizeStoreGalleryUrls(urls: string[] | undefined) {
  return (urls ?? [])
    .map((url) => url.trim())
    .filter((url, index, all) => /^https?:\/\//i.test(url) && all.indexOf(url) === index)
}

function StoreGalleryImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} />
}

function ShopInfo({ settings }: { settings: BuyerStoreSettings }) {
  const galleryUrls = normalizeStoreGalleryUrls(settings.galleryUrls)

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

      <article className="buyer-shop-information-card">
        <p className="buyer-shop-information-eyebrow">Gallery</p>
        <h2>Inside the shop</h2>
        {galleryUrls.length ? (
          <div className="buyer-shop-gallery" aria-label="Store gallery">
            {galleryUrls.map((url, index) => (
              <StoreGalleryImage key={url} url={url} alt={`${settings.brandName} gallery ${index + 1}`} />
            ))}
          </div>
        ) : (
          <p className="buyer-shop-field-unavailable">Store gallery has not been provided by the seller.</p>
        )}
      </article>
    </div>
  )
}

export function StoreInformationContent({ section, settings }: { section: StoreInformationSection; settings: BuyerStoreSettings }) {
  if (section === "shop-info") return <ShopInfo settings={settings} />

  if (section === "shipping") return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Information & policies</p>
      <h2>Shipping</h2>
      <p>Available shipping methods and prices are calculated from your delivery address during checkout.</p>
      <p className="buyer-shop-policy-note">Carrier updates are shown only when the seller or supplier provides tracking evidence.</p>
    </article>
  )

  if (section === "payment") return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Information & policies</p>
      <h2>Payment</h2>
      <p>Payment methods supported for your cart are displayed during checkout.</p>
      <p className="buyer-shop-policy-note">This store has not provided a separate seller payment policy.</p>
    </article>
  )

  if (section === "returns") return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Information & policies</p>
      <h2>Returns &amp; exchanges</h2>
      <p>Online return and exchange requests are not available in the buyer portal yet.</p>
      <p className="buyer-shop-policy-note">For help with an existing order, contact support with your order number.</p>
    </article>
  )

  if (section === "cancellations") return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Information & policies</p>
      <h2>Cancellations</h2>
      <p>Cancellation availability depends on the current payment and fulfillment state of the order.</p>
      <p className="buyer-shop-policy-note">Check order details for available actions. A seller-specific cancellation policy has not been provided.</p>
    </article>
  )

  if (section === "faqs") return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Store information</p>
      <h2>Frequently asked questions</h2>
      <div className="buyer-shop-faqs">
        <details><summary>Where will I see shipping options?</summary><p>Eligible methods and prices appear at checkout after a supported delivery address is entered.</p></details>
        <details><summary>Can I message the seller?</summary><p>Direct buyer–seller messaging is not available yet. Please use the Help Center for support.</p></details>
        <details><summary>Where can I track an order?</summary><p>Open your order details. Tracking is shown only after shipping evidence is available.</p></details>
      </div>
    </article>
  )

  return (
    <article className="buyer-shop-information-card">
      <p className="buyer-shop-information-eyebrow">Information & policies</p>
      <h2>Privacy Policy</h2>
      <p>This seller has not provided a store-specific privacy policy.</p>
      <p className="buyer-shop-policy-note">Read the platform <a href="/privacy">Privacy Policy</a> for information about how buyer data is handled.</p>
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
              {index > 2 && item.id !== "faqs" && item.id !== "privacy" ? <small>Limited</small> : null}
            </button>
          ))}
        </nav>

        <div className="buyer-shop-support-card">
          <span aria-hidden="true">?</span>
          <h3>Customer support</h3>
          {settings.supportEmail ? <a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a> : <p>Seller support email unavailable.</p>}
          <a className="buyer-shop-support-action" href="/help">Message us via Help Center</a>
          <small>Direct seller messaging is unavailable.</small>
        </div>
      </aside>

      <div className="buyer-shop-information-content">
        <StoreInformationContent section={activeSection} settings={settings} />
      </div>
    </section>
  )
}
