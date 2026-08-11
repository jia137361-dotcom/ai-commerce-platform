export type InfoParagraph = string

export type InfoBulletGroup = {
  heading?: string
  items: string[]
}

export type InfoSection = {
  title: string
  paragraphs?: InfoParagraph[]
  bullets?: InfoBulletGroup[]
  links?: Array<{ label: string; href: string }>
}

export type InfoDocument = {
  title: string
  subtitle?: string
  effectiveDate?: string
  company?: string
  website?: string
  sections: InfoSection[]
}

export type HelpTopic = {
  id: string
  title: string
  sections: InfoSection[]
}

export type HelpDocument = {
  title: string
  intro: string
  topics: HelpTopic[]
  contact: InfoSection
}
