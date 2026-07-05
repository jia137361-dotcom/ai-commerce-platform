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
      <Button href="/store">Back to store</Button>
      <Button href="/account" variant="secondary">Buyer account</Button>
      <Button href="/account/orders" variant="secondary">View orders</Button>
    </nav>
  )
}

export function DraftLegalNotice() {
  return (
    <Card as="aside" variant="muted" className="buyer-info-draft-notice">
      <strong>Internal demo notice</strong>
      <p>Draft for internal demo; final legal copy required before production.</p>
    </Card>
  )
}

export function HelpContent() {
  return (
    <div className="buyer-help-landing">
      <p className="buyer-help-intro">
        Find practical guidance for accounts, orders, product design, shipping, payments, after-sales support, AI tools, and platform policies.
      </p>
      <div className="buyer-help-category-grid">
        {HELP_CATEGORIES.map((category) => (
          <section className="buyer-help-category" key={category.title}>
            <header>
              <h2>{category.title}</h2>
              <p>{category.description}</p>
            </header>
            <div className="buyer-help-article-list">
              {category.articles.map((entry) => (
                <a className="buyer-help-article-link" href={`/help/${entry.slug}`} key={entry.slug}>
                  {entry.title}
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
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
      <div className="buyer-help-backlink">
        <a href="/help">Back to Help Center</a>
      </div>
    </div>
  )
}

export function ContactUsContent() {
  return (
    <InfoSections sections={[
      {
        title: "Contact Citigoo",
        body: <p>For internal staging support, contact the Citigoo team through the approved project support channel. Final public contact methods should be reviewed before production launch.</p>,
      },
      {
        title: "Company address",
        body: <p>Citigoo Limited, RM 1805, 18/F, Hollywood Plaza, 610 Nathan Road, Kowloon, Hong Kong.</p>,
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
    <InfoSections sections={[
      {
        title: "Policies",
        body: <p>This page groups Citigoo marketplace policy placeholders for internal staging. Final terms, privacy, copyright, cookie, and acceptable-use policies require legal review.</p>,
      },
      {
        title: "Buyer and seller responsibilities",
        body: <p>Policy details for marketplace buyers, sellers, suppliers, fulfillment, disputes, and content moderation are not final until approved for production.</p>,
      },
    ]} />
  )
}

export function AboutUsContent() {
  return (
    <InfoSections sections={[
      {
        title: "About Citigoo",
        body: <p>Citigoo is building a marketplace for customizable products, AI-assisted design, and supplier-backed fulfillment workflows.</p>,
      },
      {
        title: "Company",
        body: <p>Citigoo Limited is located at RM 1805, 18/F, Hollywood Plaza, 610 Nathan Road, Kowloon, Hong Kong.</p>,
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
    ]} />
  )
}

export function TermsContent() {
  return (
    <InfoSections sections={[
      {
        title: "Marketplace terms placeholder",
        body: <p>These draft terms describe an internal marketplace demo only. They are not production terms and do not create final buyer, seller, merchant, or supplier obligations.</p>,
      },
      {
        title: "Order placement",
        body: <p>Submitting checkout creates an order using the product, contact, shipping, and pricing information available at that time. Order placement does not guarantee supplier acceptance or fulfillment.</p>,
      },
      {
        title: "Payment authorization",
        body: <p>The current system-default provider authorizes the payment amount but does not capture funds. Authorization must not be presented as completed collection.</p>,
      },
      {
        title: "Cancellation",
        body: <p>Cancellation may be offered before capture and fulfillment when the backend eligibility response allows it. An action may become unavailable as the order state changes.</p>,
      },
      {
        title: "Refund requests",
        body: <p>A submitted request enters pending review. It is not proof of provider execution, approval, or a financial return, and no outcome is guaranteed.</p>,
      },
      {
        title: "Supplier and merchant fulfillment placeholder",
        body: <p>Product preparation, shipment, merchant responsibility, supplier responsibility, service levels, and dispute handling require approved production terms before launch.</p>,
      },
      {
        title: "Internal demo disclaimer",
        body: <p>This storefront is an internal demonstration. Product, fulfillment, payment, support, and legal behavior may be incomplete and must be reviewed before production use.</p>,
      },
    ]} />
  )
}

export function PrivacyContent() {
  return (
    <InfoSections sections={[
      {
        title: "Basic privacy placeholder",
        body: <p>This draft describes the categories of data used by the internal buyer demo. Retention, lawful basis, processors, user rights, and regional disclosures still require legal review.</p>,
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
        title: "Seller and admin data separation",
        body: <p>Buyer account cleanup is scoped to buyer state. It does not clear seller-dashboard authentication state; seller and admin access must remain separately controlled.</p>,
      },
      {
        title: "Internal demo disclaimer",
        body: <p>This is not a final privacy notice. Production deployment requires approved privacy copy, retention rules, security review, and verified contact details.</p>,
      },
    ]} />
  )
}
