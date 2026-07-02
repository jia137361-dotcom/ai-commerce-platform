import type { ReactNode } from "react"
import { SectionHeader } from "../layout/SectionHeader"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

type InfoSection = {
  title: string
  body: ReactNode
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
    <InfoSections sections={[
      {
        title: "How to order",
        body: <p>Browse the store, choose a product, add it to your cart, then review quantities and product details before continuing to checkout.</p>,
      },
      {
        title: "How checkout works",
        body: <p>Checkout collects buyer contact details, a shipping address, and an available shipping method before placing the order.</p>,
      },
      {
        title: "Payment authorization",
        body: <p>Current local payment mode authorizes payment but does not capture it. An authorization is not evidence that money was collected.</p>,
      },
      {
        title: "Cancel an order",
        body: <p>Cancel order may be available before capture and fulfillment. Availability is determined by the current order state and is shown on authenticated order details.</p>,
      },
      {
        title: "Request a refund",
        body: <p>A refund request means pending review, not money returned. The current local provider has no verified real refund execution.</p>,
      },
      {
        title: "Guest order lookup",
        body: <p>Guests can use the order display ID and checkout email on the <a href="/orders/lookup">order lookup page</a>. Guest lookup does not expose authenticated cancellation or refund-request actions.</p>,
      },
      {
        title: "Support and contact",
        body: <p>This is an internal support placeholder. For demo assistance, use <a href="mailto:support@citigoo.example">support@citigoo.example</a>; replace it with an approved support channel before production.</p>,
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
