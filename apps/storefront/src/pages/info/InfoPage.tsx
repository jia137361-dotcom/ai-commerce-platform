import { PageShell } from "../../components/layout/PageShell"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { Card } from "../../components/ui/Card"
import {
  DraftLegalNotice,
  HelpContent,
  PrivacyContent,
  StaticPageNavigation,
  TermsContent,
} from "../../components/info/StaticInfoContent"
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
