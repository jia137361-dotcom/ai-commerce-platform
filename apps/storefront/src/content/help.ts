import type { HelpDocument } from "./types"

export const helpDocument: HelpDocument = {
  title: "Support Center & FAQ",
  intro:
    "Find clear guidance for shopping on Ciiverse, using AI design tools, placing custom product orders, tracking delivery, requesting after-sales support, and understanding platform policies.",
  topics: [
    {
      id: "getting-started",
      title: "Getting Started",
      sections: [
        {
          title: "Create an Account",
          paragraphs: [
            "Creating a Ciiverse account lets you save AI-generated designs, manage addresses, place orders, track shipments, review order history, and contact support.",
          ],
          bullets: [
            {
              heading: "How to create an account",
              items: [
                "Select Sign Up or Orders & Account.",
                "Enter your email address or continue with an authorized login provider.",
                "Create a secure password when prompted.",
                "Verify your email address and complete your profile.",
              ],
            },
            {
              heading: "Account benefits",
              items: [
                "Save AI-generated images and product designs.",
                "Track orders and shipment updates.",
                "Manage delivery addresses and order history.",
                "Access support faster with your order details attached.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "ai-design-tools",
      title: "AI Design Tools",
      sections: [
        {
          title: "Generate AI Images",
          paragraphs: [
            "Ciiverse AI tools help you create artwork for print-on-demand products. AI outputs may vary, so review each design before using it on a product.",
          ],
          bullets: [
            {
              heading: "Tips for better prompts",
              items: [
                "Describe the subject, style, colors, mood, and intended product.",
                "Generate multiple versions before choosing a final design.",
                "Avoid copyrighted characters, brand logos, trademarks, or celebrity likenesses unless you have permission.",
              ],
            },
          ],
        },
        {
          title: "Upload Your Own Artwork",
          paragraphs: [
            "You may upload images, logos, illustrations, or photographs to personalize products, provided you own or have the rights to use them.",
          ],
          bullets: [
            {
              heading: "Supported formats",
              items: ["PNG", "JPG", "JPEG"],
            },
            {
              heading: "Artwork requirements",
              items: [
                "Use high-resolution files whenever possible.",
                "Do not upload content that infringes copyright, trademark, privacy, publicity, or other third-party rights.",
                "Do not upload unlawful, hateful, violent, obscene, fraudulent, or abusive content.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "product-customization",
      title: "Product Customization",
      sections: [
        {
          title: "Design Products",
          paragraphs: [
            "The Ciiverse editor lets you place artwork on supported products, adjust placement, resize elements, rotate images, add text, and preview product options before checkout.",
          ],
          bullets: [
            {
              heading: "Common product types",
              items: ["Apparel", "Mugs", "Posters", "Home decor", "Accessories"],
            },
            {
              heading: "Before ordering",
              items: [
                "Check product color, size, print side, quantity, and preview images.",
                "Review spelling, artwork placement, and uploaded file quality.",
                "Remember that screen colors and printed colors may differ slightly.",
              ],
            },
          ],
        },
        {
          title: "Print Quality",
          paragraphs: [
            "Print quality depends on source image resolution, product material, print area, and production method. Slight color, size, placement, or texture variations may occur with made-to-order products.",
          ],
        },
      ],
    },
    {
      id: "orders-cancellations",
      title: "Orders & Cancellations",
      sections: [
        {
          title: "Place and Review an Order",
          paragraphs: [
            "Before placing an order, review your product options, delivery address, shipping method, taxes, duties, and final price at checkout.",
          ],
          bullets: [
            {
              heading: "Order records",
              items: [
                "Your order history is available from Orders & Account.",
                "Invoices or receipts can be viewed from your order details when available.",
                "Shipment tracking appears after the carrier receives the package.",
              ],
            },
          ],
        },
        {
          title: "Cancel or Modify an Order",
          paragraphs: [
            "Orders may be cancelled or modified only before production starts. Once production or fulfillment has started, cancellation, design edits, color changes, size changes, quantity changes, and address changes may no longer be possible.",
          ],
          bullets: [
            {
              heading: "If you need a change",
              items: [
                "Open your order details as soon as possible.",
                "Contact support with your order number and requested change.",
                "If the order has already shipped, work with support and the carrier for delivery issues.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "shipping-delivery",
      title: "Shipping & Delivery",
      sections: [
        {
          title: "Shipping Methods and Delivery Times",
          paragraphs: [
            "Ciiverse works with production partners, fulfillment providers, and carriers to deliver orders. Available shipping methods, rates, and delivery estimates are calculated at checkout based on your delivery address and product availability.",
            "Delivery estimates are not guarantees. Production partners, carriers, customs, weather, holidays, or other events may cause delays.",
          ],
          bullets: [
            {
              heading: "Typical made-to-order timeline",
              items: [
                "Production or processing: commonly 2-7 business days.",
                "Shipping after carrier handoff: commonly 5-15 business days for many destinations.",
                "Exact estimates are shown during checkout when available.",
              ],
            },
          ],
        },
        {
          title: "International Shipping, Customs, and Duties",
          paragraphs: [
            "Many products may ship internationally where suppliers and carriers support delivery. Some products are only available in selected countries or regions.",
            "International orders may be subject to import duties, taxes, customs fees, or brokerage fees. Unless checkout or the seller's policy states otherwise, these charges are the buyer's responsibility.",
          ],
        },
        {
          title: "Tracking",
          paragraphs: [
            "When an order ships, tracking information appears in your order details where available. Tracking may take time to update after the carrier receives the package.",
          ],
        },
      ],
    },
    {
      id: "returns-refunds",
      title: "Returns, Refunds & Replacements",
      sections: [
        {
          title: "Custom and Made-to-Order Products",
          paragraphs: [
            "Customized and made-to-order products are generally final sale once production begins, unless they arrive damaged, defective, incorrect, or not as described.",
          ],
          bullets: [
            {
              heading: "Eligible support cases",
              items: [
                "Manufacturing defect.",
                "Damaged item or damaged package.",
                "Wrong item, wrong size, wrong color, or missing item caused by fulfillment error.",
                "Print or production issue that does not match the confirmed order details.",
              ],
            },
            {
              heading: "Usually not eligible",
              items: [
                "Change of mind after production starts.",
                "Customer-provided artwork, spelling, sizing, color, or placement mistakes approved at checkout.",
                "Normal screen-to-print color variation.",
                "Requests made after the stated support window.",
              ],
            },
          ],
        },
        {
          title: "How to Request Help",
          paragraphs: [
            "Contact support as soon as possible and include your order number, a description of the issue, photos of the product, photos of the package, and any carrier documentation if relevant.",
            "Refunds, replacements, or other remedies are reviewed according to the order details, product type, seller policy, platform policy, and applicable law.",
          ],
        },
      ],
    },
    {
      id: "payments-taxes",
      title: "Payments, Taxes & Duties",
      sections: [
        {
          title: "Payment Methods",
          paragraphs: [
            "Ciiverse accepts secure online payments where supported at checkout. Available payment methods may vary by country, currency, device, and payment provider.",
          ],
          bullets: [
            {
              heading: "Common methods",
              items: ["Visa", "Mastercard", "American Express", "JCB", "Apple Pay", "Google Pay"],
            },
          ],
        },
        {
          title: "Payment Security",
          paragraphs: [
            "Payments are processed by authorized third-party payment providers such as Stripe or PayPal where enabled. Ciiverse does not store full payment card details.",
          ],
        },
        {
          title: "Taxes and VAT",
          paragraphs: [
            "Product prices, shipping fees, taxes, VAT, GST, sales tax, import tax, and duties may be calculated or shown during checkout depending on the destination, product type, and applicable rules.",
            "If duties and taxes are not collected at checkout, the buyer may be responsible for charges collected by customs, carriers, or local authorities at delivery.",
          ],
        },
      ],
    },
    {
      id: "store-policies",
      title: "Store Policies",
      sections: [
        {
          title: "Platform Policy vs. Store Policy",
          paragraphs: [
            "Ciiverse provides platform-wide Terms, Privacy Policy, Cookie Policy, payment infrastructure, and help guidance. Individual shops may also display store-specific summaries for processing time, shipping, returns, cancellations, payment, and privacy.",
            "When a store policy is more specific for a product or order, review the shop page, product page, checkout, and order details before placing the order.",
          ],
        },
        {
          title: "Recommended Shop Policy Baseline",
          paragraphs: [
            "For print-on-demand and supplier-fulfilled products, the recommended baseline is: processing within 3-5 business days, international shipping where available, buyer responsibility for import duties unless stated otherwise, cancellation before production starts, and final sale for customized products except damaged, defective, incorrect, or not-as-described items.",
          ],
        },
      ],
    },
    {
      id: "copyright-legal",
      title: "Copyright & Legal",
      sections: [
        {
          title: "User Responsibility",
          paragraphs: [
            "You are responsible for the legality of content you upload, generate, edit, or print. Do not use copyrighted works, trademarks, logos, brand names, celebrity likenesses, private images, or other protected material unless you have the necessary rights.",
          ],
        },
        {
          title: "Takedown and Content Review",
          paragraphs: [
            "Ciiverse may remove content, refuse production, cancel orders, suspend accounts, or respond to legal complaints when content appears to violate intellectual-property rights, platform rules, or applicable law.",
          ],
          links: [
            { label: "Terms of Service", href: "/terms" },
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Cookie Policy", href: "/cookies" },
          ],
        },
      ],
    },
    {
      id: "privacy-cookies",
      title: "Privacy & Cookies",
      sections: [
        {
          title: "Personal Information",
          paragraphs: [
            "Ciiverse collects and processes account, order, payment, delivery, uploaded content, AI generation, device, cookie, and support information as described in the Privacy Policy.",
          ],
          links: [{ label: "Privacy Policy", href: "/privacy" }],
        },
        {
          title: "Cookies",
          paragraphs: [
            "Ciiverse uses necessary, functional, analytics, and marketing cookies or similar technologies for login, cart, checkout, security, preferences, analytics, and service improvement.",
          ],
          links: [{ label: "Cookie Policy", href: "/cookies" }],
        },
      ],
    },
  ],
  contact: {
    title: "Contact Support",
    paragraphs: [
      "For help with orders, design tools, accounts, payments, delivery, or after-sales support, contact support@ciiverse.com.",
      "For privacy requests, contact privacy@ciiverse.com. For copyright reports, contact copyright@ciiverse.com. For legal matters, contact legal@ciiverse.com.",
    ],
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
}
