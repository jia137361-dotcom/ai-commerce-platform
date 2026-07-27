import { PageShell } from "../../components/layout/PageShell"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { Card } from "../../components/ui/Card"
import {
  AboutContent,
  CookiesContent,
  HelpContent,
  PrivacyContent,
  SourceDocumentNotice,
  StaticPageNavigation,
  TermsContent,
} from "../../components/info/StaticInfoContent"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { type ReactNode } from "react"

type InfoPageProps = {
  cartCount: number
  title: string
  sourceLabel: string
  children: ReactNode
}

export function InfoPage({ cartCount, title, sourceLabel, children }: InfoPageProps) {
  const { settings, marketplaceMode } = useBuyerPageSettings()

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
        <SourceDocumentNotice source={sourceLabel} />
        <StaticPageNavigation />
      </Card>
    </PageShell>
  )
}

export function HelpPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Support Center & FAQ" sourceLabel="Getting Started / Support Center & FAQ">
      <HelpContent />
    </InfoPage>
  )
}

export function TermsPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Terms of Service" sourceLabel="CIIVERSE TERMS OF SERVICE">
      <TermsContent />
    </InfoPage>
  )
}

export function PrivacyPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Privacy Policy" sourceLabel="Ciiverse AI POD Privacy Policy">
      <PrivacyContent />
    </InfoPage>
  )
}

export function AboutPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="About Ciiverse" sourceLabel="About Ciiverse">
      <AboutContent />
    </InfoPage>
  )
}

export function CookiesPage({ cartCount }: { cartCount: number }) {
  return (
    <InfoPage cartCount={cartCount} title="Cookie Policy" sourceLabel="Ciiverse Cookie Policy">
      <CookiesContent />
    </InfoPage>
  )
}
