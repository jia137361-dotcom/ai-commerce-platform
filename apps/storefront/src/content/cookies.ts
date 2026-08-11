import type { InfoDocument } from "./types"

export const cookiesDocument: InfoDocument = {
  title: "Cookie Policy",
  effectiveDate: "15 June 2026",
  company: "Citigoo Limited (Hong Kong)",
  website: "https://www.ciiverse.com",
  sections: [
    {
      title: "Introduction",
      paragraphs: [
        "This Cookie Policy explains how Citigoo Limited (\"Ciiverse\", \"we\", \"our\", or \"us\") uses cookies and similar tracking technologies when you visit or use ciiverse.com, AI image generation tools, image editing services, Print-on-Demand services, ecommerce integrations, mobile applications, and related services.",
        "This Cookie Policy should be read together with our Privacy Policy and Terms of Service.",
      ],
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
      ],
    },
    {
      title: "What Are Cookies",
      paragraphs: [
        "Cookies are small text files stored on your device when you visit a website.",
      ],
      bullets: [
        {
          heading: "We also use",
          items: [
            "Pixels",
            "Web Beacons",
            "Local Storage",
            "SDK Tracking Technologies",
            "Similar Technologies",
          ],
        },
        {
          heading: "These technologies help us",
          items: [
            "Authenticate users",
            "Secure accounts",
            "Process orders",
            "Generate analytics",
            "Improve AI services",
            "Personalize user experience",
          ],
        },
      ],
    },
    {
      title: "Strictly Necessary Cookies",
      paragraphs: [
        "Required for operation of the platform. These cookies cannot be disabled.",
      ],
      bullets: [
        {
          heading: "Examples",
          items: [
            "Login authentication",
            "Shopping cart",
            "Checkout",
            "Payment processing",
            "Security protection",
            "Session management",
            "Stripe Session Cookies",
          ],
        },
      ],
    },
    {
      title: "Functional Cookies",
      paragraphs: [
        "Used to remember user preferences.",
      ],
      bullets: [
        {
          heading: "Examples",
          items: [
            "Language selection",
            "Currency settings",
            "Theme preferences",
            "AI editor settings",
            "Saved design preferences",
          ],
        },
      ],
    },
    {
      title: "Analytics Cookies",
      paragraphs: [
        "Used to understand platform usage.",
      ],
      bullets: [
        {
          heading: "Examples / providers",
          items: [
            "Google Analytics",
          ],
        },
        {
          heading: "Collected information",
          items: [
            "Device type",
            "Browser type",
            "Country and region",
            "Session duration",
            "Click behavior",
            "Feature usage",
          ],
        },
      ],
    },
    {
      title: "Marketing Cookies",
      paragraphs: [
        "Used for advertising and remarketing.",
      ],
      bullets: [
        {
          heading: "Collected information",
          items: [
            "Ad interactions",
            "Conversion events",
            "Product views",
            "Cart activity",
          ],
        },
      ],
    },
    {
      title: "AI Services and Tracking Technologies",
      paragraphs: [
        "When users interact with AI image generation, AI editing tools, and design assistants, we may collect prompt usage statistics, feature interaction metrics, error logs, and performance diagnostics.",
        "This information is used solely to improve service quality, prevent abuse, and monitor platform performance.",
        "We do not use uploaded images or generated images to train proprietary AI models without user consent.",
      ],
    },
    {
      title: "Withdrawal of Consent",
      paragraphs: [
        "Users may withdraw cookie consent at any time by adjusting cookie settings, clearing browser cookies, or contacting us.",
        "Withdrawal of consent will not affect prior lawful processing.",
      ],
    },
    {
      title: "Browser Controls",
      paragraphs: [
        "Most browsers allow users to delete cookies, block cookies, or restrict third-party cookies.",
        "Disabling certain cookies may affect login functionality, checkout, design saving, and AI generation history.",
      ],
    },
    {
      title: "International Data Transfers",
      paragraphs: [
        "Information collected through cookies may be processed in Hong Kong, the United States, and the European Union.",
        "We implement appropriate safeguards where required by law.",
      ],
    },
    {
      title: "Changes to This Policy",
      paragraphs: [
        "We may update this Cookie Policy periodically. Material changes will be posted on https://www.ciiverse.com.",
      ],
    },
    {
      title: "Contact Us",
      paragraphs: [
        "Citigoo Limited, Hong Kong SAR",
      ],
      bullets: [
        {
          heading: "Contact",
          items: [
            "Email: privacy@ciiverse.com",
            "Legal: legal@ciiverse.com",
            "Website: https://www.ciiverse.com",
          ],
        },
      ],
    },
  ],
}
