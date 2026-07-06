import { useEffect, useMemo, useState, type ReactNode } from "react"
import { SectionHeader } from "../layout/SectionHeader"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { HELP_CATEGORIES, type HelpArticleWithCategory } from "./help-center-content"

type InfoSection = {
  title: string
  body: ReactNode
}

type ShipToRegion = {
  id: string
  zone: string
  country_region_en: string
  country_region_zh: string
  country_code: string
  phone_code: string | null
  abbreviation: string
  enabled: boolean
  blocked: boolean
  blocked_reason: string | null
  sort_order: number
  raw_json: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

type ShipToRegionsResponse = {
  count: number
  regions: ShipToRegion[]
}

const logisticsBackendUrl =
  (import.meta.env.VITE_MEDUSA_BACKEND_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_MEDUSA_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:9000"
const logisticsPublishableKey =
  (import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_PUBLISHABLE_API_KEY as string | undefined)?.trim() ||
  (import.meta.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string | undefined)?.trim()

const isMissingPublishableKey = (value?: string) =>
  !value || value.length === 0 || value === "pk_replace_me"

const groupRegionsByZone = (regions: ShipToRegion[]) => {
  const groups = new Map<string, ShipToRegion[]>()
  for (const region of regions) {
    const zone = region.zone || "Other"
    groups.set(zone, [...(groups.get(zone) ?? []), region])
  }
  return Array.from(groups.entries())
    .map(([zone, zoneRegions]) => ({
      zone,
      regions: zoneRegions.sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.zone.localeCompare(b.zone))
}

function InfoSections({ sections }: { sections: InfoSection[] }) {
  return (
    <div className="buyer-info-sections">
      {sections.map((section) => (
        <Card as="section" className="buyer-info-section" key={section.title}>
          <SectionHeader title={section.title} level={2} />
          <div className="buyer-info-section-body">{section.body}</div>
        </Card>
      ))}
    </div>
  )
}

function SupportedShippingRegions() {
  const [regions, setRegions] = useState<ShipToRegion[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState<string>()
  const missingKey = isMissingPublishableKey(logisticsPublishableKey)

  useEffect(() => {
    if (missingKey) {
      setStatus("error")
      setError("VITE_MEDUSA_PUBLISHABLE_KEY is missing or still a placeholder.")
      return
    }

    const controller = new AbortController()
    setStatus("loading")
    setError(undefined)

    fetch(`${logisticsBackendUrl}/store/logistics/ship-to-regions`, {
      signal: controller.signal,
      headers: {
        "x-publishable-api-key": logisticsPublishableKey ?? "",
      },
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(body?.error?.message ?? response.statusText)
        }
        return body as ShipToRegionsResponse
      })
      .then((body) => {
        setRegions(body.regions.filter((region) => region.enabled && !region.blocked))
        setStatus("success")
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return
        setStatus("error")
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load supported shipping regions.")
      })

    return () => controller.abort()
  }, [missingKey])

  const groupedRegions = useMemo(() => groupRegionsByZone(regions), [regions])

  return (
    <section className="buyer-shipping-regions" aria-label="Supported shipping regions">
      <header>
        <div>
          <p>Supported Shipping Regions</p>
          <h3>
            {status === "success"
              ? `We currently support shipping to ${regions.length} countries and regions.`
              : "Supported shipping regions"}
          </h3>
        </div>
      </header>

      {status === "loading" || status === "idle" ? (
        <p className="buyer-shipping-regions-message">Loading supported regions...</p>
      ) : status === "error" ? (
        <p className="buyer-shipping-regions-error" role="alert">{error}</p>
      ) : groupedRegions.length ? (
        <div className="buyer-shipping-region-zones">
          {groupedRegions.map((group) => (
            <article className="buyer-shipping-region-zone" key={group.zone}>
              <h4>{group.zone}</h4>
              <div>
                {group.regions.map((region) => (
                  <span key={region.id} title={`${region.country_region_en} (${region.abbreviation})`}>
                    {region.country_region_en}
                    <small>{region.country_region_zh} · {region.abbreviation}</small>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="buyer-shipping-regions-message">No supported shipping regions are available yet.</p>
      )}
    </section>
  )
}

export function StaticPageNavigation() {
  return (
    <nav className="buyer-info-actions" aria-label="Buyer shortcuts">
      <Button href="/help" variant="secondary">Back to Help Center</Button>
    </nav>
  )
}

export function HelpContent() {
  return (
    <div className="buyer-help-landing">
      <div className="buyer-help-accordion" aria-label="Help Center categories">
        {HELP_CATEGORIES.map((category, index) => (
          <details className="buyer-help-category" key={category.title} open={index === 0}>
            <summary>
              <span>{category.title}</span>
              <span className="buyer-help-chevron" aria-hidden="true" />
            </summary>
            <div className="buyer-help-article-list">
              {category.articles.map((entry) => (
                <a className="buyer-help-article-link" href={`/help/${entry.slug}`} key={entry.slug}>
                  {entry.title}
                </a>
              ))}
            </div>
          </details>
        ))}
      </div>
      <section className="buyer-help-contact-card" aria-label="Contact support">
        <h2>Still can't solve the problem?</h2>
        <Button href="/help/contact-us" variant="secondary">Contact us</Button>
      </section>
    </div>
  )
}

export function HelpArticleContent({ article }: { article: HelpArticleWithCategory }) {
  return (
    <div className="buyer-help-article">
      <p className="buyer-help-category-label">{article.category}</p>
      <p className="buyer-help-article-intro">{article.intro}</p>
      <InfoSections sections={article.sections.map((section) => ({
        title: section.heading,
        body: <p>{section.body}</p>,
      }))} />
    </div>
  )
}

export function ContactUsContent() {
  return (
    <InfoSections sections={[
      {
        title: "How to reach us",
        body: <p>For order questions, product issues, account access, or policy concerns, contact Citigoo through the approved support channel shown in your order or account experience.</p>,
      },
      {
        title: "Company address",
        body: <p>Citigoo Limited, RM 1805, 18/F, Hollywood Plaza, 610 Nathan Road, Kowloon, Hong Kong.</p>,
      },
      {
        title: "What to include",
        body: <p>Include your order number, checkout email, product name, photos when relevant, and a short description of the issue so the support team can review the case.</p>,
      },
      {
        title: "Response expectations",
        body: <p>Support timing may vary by issue type, region, supplier review, and internal workload. We will avoid promising an outcome before the request is reviewed.</p>,
      },
      {
        title: "Rights and policy notices",
        body: <p>For copyright, trademark, or acceptable-use concerns, include the product or store link and enough detail for the platform team to identify the content.</p>,
      },
    ]} />
  )
}

export function ShippingInformationContent() {
  return (
    <>
      <InfoSections sections={[
        {
          title: "Shipping regions",
          body: <p>Available shipping destinations are aligned with the supplier logistics catalog. Sanctioned or blocked regions must not accept orders or shipping.</p>,
        },
        {
          title: "Delivery estimates",
          body: <p>Delivery time depends on product preparation, shipping-from warehouse, destination country or region, and the carrier service available for the order.</p>,
        },
      ]} />
      <SupportedShippingRegions />
    </>
  )
}

export function PaymentMethodContent() {
  return (
    <InfoSections sections={[
      {
        title: "Payment methods",
        body: <p>Checkout payment options depend on the active staging payment provider and the buyer's region. Production payment copy requires final provider confirmation.</p>,
      },
      {
        title: "Payment authorization",
        body: <p>In the current local demo flow, payment may be authorized without confirmed capture. Do not treat authorization as proof that money was collected.</p>,
      },
    ]} />
  )
}

export function OrderStatusContent() {
  return (
    <InfoSections sections={[
      {
        title: "Track an order",
        body: <p>Signed-in buyers can review order history from their account. Guests can use the order lookup page with their checkout email and order display ID.</p>,
      },
      {
        title: "Supplier fulfillment status",
        body: <p>Fulfillment and carrier milestones appear after supplier synchronization returns shipment data for the order.</p>,
      },
    ]} />
  )
}

export function PoliciesContent() {
  return (
    <div className="buyer-policy-index">
      <p className="buyer-help-intro">
        Review the core customer-facing policies for using Citigoo, placing orders, managing data, and publishing custom content.
      </p>
      <div className="buyer-policy-link-list">
        <a href="/terms">Terms of Service</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="/cookie-policy">Cookie Policy</a>
        <a href="/copyright-policy">Copyright Policy</a>
        <a href="/acceptable-use-policy">Acceptable Use Policy</a>
        <a href="/refund-policy">Refund Policy</a>
      </div>
      <InfoSections sections={[
        {
          title: "Policy status",
          body: <p>These pages provide generic customer-facing copy for staging and internal review. Final production copy should be approved by the appropriate legal, operations, and support owners.</p>,
        },
        {
          title: "Buyer and seller responsibilities",
          body: <p>Buyers, sellers, designers, and store operators are responsible for accurate order information, lawful content, respectful platform use, and timely cooperation during support reviews.</p>,
        },
      ]} />
    </div>
  )
}

export function AboutUsContent() {
  return (
    <InfoSections sections={[
      {
        title: "About Citigoo",
        body: <p>Citigoo is building a marketplace for customizable products, AI-assisted design, and supplier-backed fulfillment workflows for creators, buyers, and operations teams.</p>,
      },
      {
        title: "What we offer",
        body: <p>The platform helps customers discover products, prepare custom artwork, review product options, place orders, and follow fulfillment updates when supplier data is available.</p>,
      },
      {
        title: "Our approach",
        body: <p>We focus on clear product information, practical design tools, transparent order status, and support workflows that can be reviewed before final production launch.</p>,
      },
      {
        title: "Company",
        body: <p>Citigoo Limited is located at RM 1805, 18/F, Hollywood Plaza, 610 Nathan Road, Kowloon, Hong Kong.</p>,
      },
      {
        title: "Internal staging note",
        body: <p>This environment may include demo data, draft policies, and incomplete operations flows. Public launch copy and operating procedures should be reviewed before production use.</p>,
      },
    ]} />
  )
}

export function RefundAndReplacementContent() {
  return (
    <InfoSections sections={[
      {
        title: "Refund and replacement",
        body: <p>Refund and replacement requests may be reviewed for product abnormalities, damaged fragile items, package return exceptions, or other after-sales issues.</p>,
      },
      {
        title: "Current staging limitation",
        body: <p>A submitted request means pending review. It is not proof of provider refund execution, approval, or a completed financial return.</p>,
      },
      {
        title: "Evidence helps review",
        body: <p>Clear photos, packaging images, tracking details, and a concise issue description help support understand whether the item is damaged, abnormal, incomplete, or delayed.</p>,
      },
      {
        title: "Custom products",
        body: <p>Custom products may require additional review because artwork, product options, supplier production, and buyer-provided details can affect the available resolution.</p>,
      },
    ]} />
  )
}

export function TermsContent() {
  return (
    <InfoSections sections={[
      {
        title: "Using Citigoo",
        body: <p>By using Citigoo, you agree to use the platform lawfully, provide accurate information, respect other people's rights, and follow the policies linked from this site.</p>,
      },
      {
        title: "Accounts and order information",
        body: <p>You are responsible for keeping account access secure and providing accurate contact, address, product, size, artwork, and quantity information before checkout.</p>,
      },
      {
        title: "Orders and fulfillment",
        body: <p>Submitting checkout creates an order using the information available at that time. Order placement does not guarantee supplier acceptance, production timing, carrier timing, or successful delivery to an incorrect address.</p>,
      },
      {
        title: "Payments",
        body: <p>Payment availability and processing depend on the configured payment provider and order state. In staging, payment authorization must not be presented as confirmed capture or completed collection.</p>,
      },
      {
        title: "Cancellations and after-sales requests",
        body: <p>Cancellation, refund, replacement, or other after-sales options may depend on order state, fulfillment progress, product type, evidence, and provider constraints. A request does not guarantee approval.</p>,
      },
      {
        title: "Custom content",
        body: <p>You should only upload, generate, or publish artwork and text that you have the right to use. Content may be reviewed or removed when it creates legal, safety, privacy, or policy risk.</p>,
      },
      {
        title: "Changes and staging limitations",
        body: <p>Features, suppliers, policies, prices, and support processes may change. This staging copy is production-oriented but still requires final approval before public launch.</p>,
      },
    ]} />
  )
}

export function PrivacyContent() {
  return (
    <InfoSections sections={[
      {
        title: "Information we use",
        body: <p>Citigoo may use account, contact, address, cart, order, product-design, support, device, and usage information to operate the storefront and related services.</p>,
      },
      {
        title: "Account data",
        body: <p>Buyer account flows may use email, name, phone number, customer ID, and customer-session information for sign-in, profile display, checkout, and authenticated order access.</p>,
      },
      {
        title: "Cart data",
        body: <p>The browser stores a store-scoped cart identifier so the buyer can return to the current cart. Signing out of the buyer account does not clear that cart identifier.</p>,
      },
      {
        title: "Order data",
        body: <p>Order records may contain contact details, shipping address, purchased items, totals, fulfillment state, tracking details, and payment-status information.</p>,
      },
      {
        title: "Guest lookup data",
        body: <p>Guest order lookup uses the checkout email and order display ID to locate one order. Buyers should avoid sharing those lookup details.</p>,
      },
      {
        title: "Support and safety",
        body: <p>Support requests may include messages, photos, issue descriptions, product links, tracking details, and review notes needed to investigate the request.</p>,
      },
      {
        title: "Data sharing",
        body: <p>Order and fulfillment data may be shared with service providers such as payment, hosting, analytics, logistics, supplier, and support systems when needed to operate the service.</p>,
      },
      {
        title: "Your choices",
        body: <p>Account, communication, and browser choices may be available through account settings, support channels, and browser controls. Some records may need to be retained for security, legal, or operational reasons.</p>,
      },
      {
        title: "Staging limitation",
        body: <p>This is generic staging copy. Production deployment requires approved privacy copy, retention rules, security review, regional disclosures, and verified contact details.</p>,
      },
    ]} />
  )
}

export function CookiePolicyContent() {
  return (
    <InfoSections sections={[
      {
        title: "How cookies support the site",
        body: <p>Cookies and similar browser storage help the storefront remember sessions, cart references, preferences, and security-related state.</p>,
      },
      {
        title: "Local storage",
        body: <p>Local storage may keep non-sensitive app state such as store-scoped cart identifiers or display preferences so the storefront can continue from the same browser.</p>,
      },
      {
        title: "Analytics and performance",
        body: <p>Staging or production environments may use analytics or performance tools to understand reliability, page behavior, and feature usage. Final provider details should be reviewed before launch.</p>,
      },
      {
        title: "Your browser controls",
        body: <p>You can block or clear cookies in your browser. Doing so may sign you out, reset preferences, or remove local cart references.</p>,
      },
    ]} />
  )
}

export function CopyrightPolicyContent() {
  return (
    <InfoSections sections={[
      {
        title: "Use content you have rights to use",
        body: <p>Only upload, generate, publish, or sell artwork, photos, text, logos, and designs that you created, licensed, or are otherwise allowed to use.</p>,
      },
      {
        title: "Content found online",
        body: <p>Images, characters, logos, slogans, and designs found online may be protected even when they are easy to copy or download.</p>,
      },
      {
        title: "Reports and review",
        body: <p>Reported content may be reviewed, restricted, unpublished, or removed while the platform evaluates the issue and available information.</p>,
      },
      {
        title: "Rights-holder requests",
        body: <p>Rights holders should provide the content location, claimed rights, contact details, and enough supporting information to help identify the reported material.</p>,
      },
      {
        title: "No legal advice",
        body: <p>This page is practical platform guidance, not legal advice. For legal questions, consult a qualified professional.</p>,
      },
    ]} />
  )
}

export function AcceptableUsePolicyContent() {
  return (
    <InfoSections sections={[
      {
        title: "Use the platform responsibly",
        body: <p>Use Citigoo in a lawful, respectful, and honest way that protects buyers, sellers, creators, suppliers, and platform operations.</p>,
      },
      {
        title: "Restricted behavior",
        body: <p>Do not use the platform for fraud, harassment, spam, deceptive activity, illegal products, rights violations, attempts to bypass security, or misuse of support workflows.</p>,
      },
      {
        title: "Restricted content",
        body: <p>Content may be restricted when it is hateful, explicit, dangerous, deceptive, infringing, privacy-invasive, or otherwise unsuitable for the marketplace.</p>,
      },
      {
        title: "AI design tools",
        body: <p>AI tools must not be used to create content that violates law, platform policy, intellectual property rights, privacy, or safety standards.</p>,
      },
      {
        title: "Platform action",
        body: <p>Products, stores, accounts, or orders may be reviewed, limited, unpublished, or removed when there is policy, safety, legal, or operational risk.</p>,
      },
    ]} />
  )
}

export function RefundPolicyContent() {
  return (
    <InfoSections sections={[
      {
        title: "Refund review",
        body: <p>Refund eligibility depends on order state, product type, issue evidence, fulfillment progress, and payment-provider constraints. Submitting a request does not guarantee approval.</p>,
      },
      {
        title: "When to contact support",
        body: <p>Contact support when an item arrives damaged, materially abnormal, missing key parts, returned unexpectedly, or affected by a shipping issue that requires review.</p>,
      },
      {
        title: "Evidence needed",
        body: <p>Photos of the item, packaging, shipping label, and a clear issue description help the support team review the case with the store or supplier.</p>,
      },
      {
        title: "Custom products",
        body: <p>Custom products may have limited after-sales options when the item matches the submitted artwork, size, color, quantity, and delivery details.</p>,
      },
      {
        title: "Payment-provider timing",
        body: <p>If a refund is approved and executed, timing may depend on the payment provider, bank, card network, and region. Citigoo should not promise exact processing times before confirmation.</p>,
      },
    ]} />
  )
}
