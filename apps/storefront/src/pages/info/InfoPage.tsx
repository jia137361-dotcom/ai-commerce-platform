import { PageShell } from "../../components/layout/PageShell"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { Card } from "../../components/ui/Card"
import {
  AboutUsContent,
  AcceptableUsePolicyContent,
  ContactUsContent,
  CookiePolicyContent,
  CopyrightPolicyContent,
  DraftLegalNotice,
  HelpArticleContent,
  HelpContent,
  OrderStatusContent,
  PaymentMethodContent,
  PoliciesContent,
  PrivacyContent,
  RefundPolicyContent,
  RefundAndReplacementContent,
  ShippingInformationContent,
  StaticPageNavigation,
  TermsContent,
} from "../../components/info/StaticInfoContent"
import { findHelpArticle } from "../../components/info/help-center-content"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { type ReactNode } from "react"

type InfoPageProps = {
  cartCount: number
  title: string
  children: ReactNode
}

export function InfoPage({ cartCount, title, children }: InfoPageProps) {
  const { settings, marketplaceMode } = useBuyerPageSettings({ marketplace: true })

  return (
    <PageShell
      className="buyer-info-page"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
      footer={<StoreFooter />}
    >
      <Card as="article" className="buyer-info-card">
        <nav className="buyer-product-breadcrumb" aria-label="Breadcrumb">
          <a href="/store">Store</a>
          <span>/</span>
          <span>{title}</span>
        </nav>
        <SectionHeader eyebrow="Buyer information" title={title} level={1} />
        <div className="buyer-info-body">{children}</div>
        <DraftLegalNotice />
        <StaticPageNavigation />
      </Card>
    </PageShell>
  )
}

export function HelpPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Help Center">
      <HelpContent />
    </InfoPage>
  )
}

export function HelpArticlePage({ cartCount, slug }: { cartCount: number; slug: string }) {
  const article = findHelpArticle(slug)

  if (!article) {
    return (
      <InfoPage cartCount={cartCount} title="Help Center">
        <HelpContent />
      </InfoPage>
    )
  }

  return (
    <InfoPage cartCount={cartCount} title={article.title}>
      <HelpArticleContent article={article} />
    </InfoPage>
  )
}

export function ContactUsPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Contact Us">
      <ContactUsContent />
    </InfoPage>
  )
}

export function ShippingInformationPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Shipping Information">
      <ShippingInformationContent />
    </InfoPage>
  )
}

export function PaymentMethodPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Payment Method">
      <PaymentMethodContent />
    </InfoPage>
  )
}

export function OrderStatusInfoPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Order Status">
      <OrderStatusContent />
    </InfoPage>
  )
}

export function PoliciesPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Policies">
      <PoliciesContent />
    </InfoPage>
  )
}

export function AboutUsPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="About Us">
      <AboutUsContent />
    </InfoPage>
  )
}

export function RefundAndReplacementPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Refund and Replacement">
      <RefundAndReplacementContent />
    </InfoPage>
  )
}

export function TermsPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Terms of Service">
      <TermsContent />
    </InfoPage>
  )
}

export function PrivacyPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Privacy Policy">
      <PrivacyContent />
    </InfoPage>
  )
}

export function CookiePolicyPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Cookie Policy">
      <CookiePolicyContent />
    </InfoPage>
  )
}

export function CopyrightPolicyPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Copyright Policy">
      <CopyrightPolicyContent />
    </InfoPage>
  )
}

export function AcceptableUsePolicyPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Acceptable Use Policy">
      <AcceptableUsePolicyContent />
    </InfoPage>
  )
}

export function RefundPolicyPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Refund Policy">
      <RefundPolicyContent />
    </InfoPage>
  )
}
