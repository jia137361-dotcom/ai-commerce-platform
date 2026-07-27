import type { HelpDocument, InfoDocument, InfoSection } from "../../content/types"
import { aboutDocument } from "../../content/about"
import { cookiesDocument } from "../../content/cookies"
import { helpDocument } from "../../content/help"
import { privacyDocument } from "../../content/privacy"
import { termsDocument } from "../../content/terms"
import { SectionHeader } from "../layout/SectionHeader"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"

function InfoSectionBody({ section }: { section: InfoSection }) {
  return (
    <div className="buyer-info-section-body">
      {section.paragraphs?.map((paragraph, index) => (
        <p key={`${section.title}-p-${index}`}>{paragraph}</p>
      ))}
      {section.bullets?.map((group, groupIndex) => (
        <div className="buyer-info-bullet-group" key={`${section.title}-b-${groupIndex}`}>
          {group.heading ? <p className="buyer-info-bullet-heading">{group.heading}</p> : null}
          <ul>
            {group.items.map((item, itemIndex) => (
              <li key={`${section.title}-b-${groupIndex}-${itemIndex}`}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      {section.links?.length ? (
        <p className="buyer-info-inline-links">
          {section.links.map((link, index) => (
            <span key={link.href}>
              {index > 0 ? " · " : null}
              <a href={link.href}>{link.label}</a>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  )
}

export function DocumentSections({ document }: { document: InfoDocument }) {
  return (
    <div className="buyer-info-sections">
      {(document.subtitle || document.effectiveDate || document.company || document.website) ? (
        <Card as="section" className="buyer-info-section buyer-info-meta" variant="muted">
          {document.subtitle ? <p>{document.subtitle}</p> : null}
          {document.effectiveDate ? <p>Effective Date: {document.effectiveDate}</p> : null}
          {document.company ? <p>Company: {document.company}</p> : null}
          {document.website ? (
            <p>
              Website:{" "}
              <a href={document.website} rel="noreferrer" target="_blank">
                {document.website}
              </a>
            </p>
          ) : null}
        </Card>
      ) : null}
      {document.sections.map((section) => (
        <Card as="section" className="buyer-info-section" key={section.title}>
          <SectionHeader title={section.title} level={2} />
          <InfoSectionBody section={section} />
        </Card>
      ))}
    </div>
  )
}

export function StaticPageNavigation() {
  return (
    <nav className="buyer-info-actions" aria-label="Buyer information links">
      <Button href="/store">Back to store</Button>
      <Button href="/help" variant="secondary">
        Help Center
      </Button>
      <Button href="/about" variant="secondary">
        About
      </Button>
      <Button href="/terms" variant="secondary">
        Terms
      </Button>
      <Button href="/privacy" variant="secondary">
        Privacy
      </Button>
      <Button href="/cookies" variant="secondary">
        Cookies
      </Button>
    </nav>
  )
}

export function SourceDocumentNotice({ source }: { source: string }) {
  return (
    <Card as="aside" variant="muted" className="buyer-info-draft-notice">
      <strong>Document source</strong>
      <p>
        Content adapted from Ciiverse official documents dated 21 June 2026 ({source}). For legal
        questions, contact legal@ciiverse.com or privacy@ciiverse.com.
      </p>
    </Card>
  )
}

function HelpTopicCard({ topic }: { topic: HelpDocument["topics"][number] }) {
  return (
    <div id={topic.id}>
      <Card as="section" className="buyer-info-section">
        <SectionHeader title={topic.title} level={2} />
        {topic.sections.map((section) => (
          <div className="buyer-info-help-block" key={`${topic.id}-${section.title}`}>
            {section.title !== topic.title ? <h3>{section.title}</h3> : null}
            <InfoSectionBody section={section} />
          </div>
        ))}
      </Card>
    </div>
  )
}

export function HelpContent() {
  return (
    <div className="buyer-info-help">
      <Card as="section" className="buyer-info-section" variant="muted">
        <p>{helpDocument.intro}</p>
        <nav className="buyer-info-toc" aria-label="Help topics">
          {helpDocument.topics.map((topic) => (
            <a key={topic.id} href={`#${topic.id}`}>
              {topic.title}
            </a>
          ))}
        </nav>
      </Card>
      {helpDocument.topics.map((topic) => (
        <HelpTopicCard key={topic.id} topic={topic} />
      ))}
      <div id="contact-support">
        <Card as="section" className="buyer-info-section">
          <SectionHeader title={helpDocument.contact.title} level={2} />
          <InfoSectionBody section={helpDocument.contact} />
        </Card>
      </div>
    </div>
  )
}

export function TermsContent() {
  return <DocumentSections document={termsDocument} />
}

export function PrivacyContent() {
  return <DocumentSections document={privacyDocument} />
}

export function AboutContent() {
  return <DocumentSections document={aboutDocument} />
}

export function CookiesContent() {
  return <DocumentSections document={cookiesDocument} />
}
