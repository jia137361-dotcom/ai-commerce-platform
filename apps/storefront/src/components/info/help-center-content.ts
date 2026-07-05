export type HelpArticleSection = {
  heading: string
  body: string
}

export type HelpArticle = {
  title: string
  slug: string
  intro: string
  sections: HelpArticleSection[]
}

export type HelpCategory = {
  title: string
  description: string
  articles: HelpArticle[]
}

const article = (
  slug: string,
  title: string,
  intro: string,
  sections: HelpArticleSection[]
): HelpArticle => ({ slug, title, intro, sections })

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    title: "Getting Started",
    description: "Create your account, prepare artwork, and start designing customizable products.",
    articles: [
      article("create-account", "Create an Account", "Create a Citigoo account to save addresses, view orders, and return to your designs.", [
        { heading: "What do I need to sign up?", body: "Use an email address you can access. We may use it for sign-in, checkout receipts, order updates, and account security notices." },
        { heading: "Why should I create an account?", body: "An account helps you keep order history, saved delivery addresses, and support context in one place." },
        { heading: "Can I order as a guest?", body: "Some checkout flows may support guest ordering. Guest lookup usually requires the checkout email and order display ID." },
        { heading: "How do I keep my account secure?", body: "Use a unique password and avoid sharing order lookup details or account access with other people." },
      ]),
      article("generate-ai-images", "Generate AI Images", "Use AI image generation as a creative starting point for product artwork.", [
        { heading: "How should I write a prompt?", body: "Describe the subject, style, colors, mood, and any text you want to avoid. Specific prompts usually produce more useful drafts." },
        { heading: "Can I edit the output?", body: "Yes. Treat AI output as a draft that may need cropping, cleanup, or manual design adjustments before printing." },
        { heading: "What content should I avoid?", body: "Do not request content that violates law, platform policy, trademarks, privacy, or another person's rights." },
        { heading: "Does AI guarantee print quality?", body: "No. Always review resolution, contrast, placement, and safe areas before placing an order." },
      ]),
      article("upload-artwork", "Upload Your Own Artwork", "Upload artwork you own or are authorized to use for custom products.", [
        { heading: "Which files work best?", body: "Use high-resolution images with clear edges and enough contrast for the product color and print method." },
        { heading: "Can I upload copyrighted artwork?", body: "Only upload artwork you created, licensed, or are otherwise permitted to use." },
        { heading: "How should I prepare transparent designs?", body: "Use transparent backgrounds when the product color should show through. Preview the result before ordering." },
        { heading: "What if the upload looks blurry?", body: "Try a larger source file or simplify the design. Very small images may not print sharply when enlarged." },
      ]),
      article("design-products", "Design Products", "Use the product designer to place artwork, preview mockups, and prepare a purchasable product.", [
        { heading: "How do I place artwork?", body: "Keep important elements inside the visible design area and avoid placing text or faces too close to edges." },
        { heading: "Can I preview the final product?", body: "Mockups help you review layout and general appearance, but physical results can vary by material, lighting, and print process." },
        { heading: "Can I change the design later?", body: "Before checkout, return to the designer or product page when editing is available. After order placement, changes may be limited." },
        { heading: "What should I check before ordering?", body: "Review spelling, image quality, product options, size, color, quantity, delivery address, and total price." },
      ]),
    ],
  },
  {
    title: "Order Management",
    description: "Understand order changes, tracking, reviews, history, and receipts.",
    articles: [
      article("cancel-order", "Cancel an Order", "Cancellation availability depends on order state, payment state, and fulfillment progress.", [
        { heading: "When can I cancel?", body: "Cancellation may be available before an order is captured, produced, packed, or handed to a carrier." },
        { heading: "Where do I request cancellation?", body: "Sign in and open your order details. If cancellation is available, the order page will show the action." },
        { heading: "Why is cancellation unavailable?", body: "The item may already be in production, prepared for shipment, fulfilled, or otherwise outside the cancellation window." },
        { heading: "Does cancellation mean a refund is complete?", body: "No. Any payment reversal or refund depends on the payment provider and order state." },
      ]),
      article("modify-order", "Modify My Order", "Order edits may be limited after checkout because production and fulfillment can begin quickly.", [
        { heading: "What can be changed?", body: "Before fulfillment begins, support may be able to review address, contact, or item questions. Changes are not guaranteed." },
        { heading: "Can I change a custom design?", body: "Custom artwork changes are usually limited once production starts. Review your design carefully before checkout." },
        { heading: "How do I request a change?", body: "Use the order detail page or contact support with your order number and the exact change needed." },
        { heading: "Will totals change?", body: "Some changes may affect shipping, taxes, or item price. Review any updated total before confirming." },
      ]),
      article("shipping-address", "My Shipping Address", "Use a complete and accurate delivery address to reduce carrier delays and failed delivery attempts.", [
        { heading: "What address details are required?", body: "Provide receiver name, phone, street, city, state or province, postal code, and country or region." },
        { heading: "Can I save addresses?", body: "Signed-in buyers may save addresses for faster checkout and choose default delivery details." },
        { heading: "Can I change the address after ordering?", body: "Address changes may be possible only before fulfillment. Contact support as soon as you notice an issue." },
        { heading: "What if the carrier cannot deliver?", body: "The carrier may return the package or request more information. Extra fees or delays can apply depending on the route." },
      ]),
      article("track-order", "Track My Order", "Track order progress from account order history or guest order lookup when available.", [
        { heading: "Where do I track my order?", body: "Signed-in buyers can open Account Orders. Guests can use order lookup with the checkout email and order display ID." },
        { heading: "When does tracking appear?", body: "Carrier tracking appears after fulfillment data is received. It may not be available immediately after checkout." },
        { heading: "Why has tracking not updated?", body: "Carrier scans can take time to appear. International shipments may have gaps between export and destination scans." },
        { heading: "What if tracking looks wrong?", body: "Contact support with your order number and the tracking detail that looks incorrect." },
      ]),
      article("leave-review", "Leave a Review", "Reviews help stores understand product quality, delivery experience, and buyer satisfaction.", [
        { heading: "Who can leave a review?", body: "Review availability may depend on order status, receipt confirmation, and store settings." },
        { heading: "What should I include?", body: "Share useful details about product quality, sizing, print result, delivery, and overall experience." },
        { heading: "Can I upload photos?", body: "If image upload is available, use photos that show the product clearly and avoid personal information." },
        { heading: "Can reviews be moderated?", body: "Reviews may be reviewed for spam, abuse, private information, or policy violations." },
      ]),
      article("order-refunds-replacements", "Refunds & Replacements", "Some orders may be eligible for after-sales review when there is a product or delivery issue.", [
        { heading: "How do I request help?", body: "Open the order detail page and use the available request action, or contact support with clear photos and order details." },
        { heading: "What information helps?", body: "Include order number, affected item, photos, packaging details, and a short description of the issue." },
        { heading: "Is approval guaranteed?", body: "No. Requests are reviewed based on order state, evidence, store policy, supplier review, and payment-provider limits." },
        { heading: "How long does review take?", body: "Review time depends on the issue and the information provided. Support may ask for more details." },
      ]),
      article("order-history", "Order History", "Order history shows past purchases, order state, totals, and available actions for signed-in buyers.", [
        { heading: "Where is order history?", body: "Sign in and open Account Orders to view your orders and recent activity." },
        { heading: "Why is an order missing?", body: "The order may have been placed as a guest, with another email, or under a different account." },
        { heading: "Can guests view orders?", body: "Guest lookup may be available with the order display ID and checkout email." },
        { heading: "What actions appear?", body: "Actions depend on order state and may include tracking, review, cancellation request, or after-sales request." },
      ]),
      article("invoices-receipts", "Invoices & Receipts", "Receipts summarize checkout details, items, totals, and order identifiers.", [
        { heading: "Where can I find a receipt?", body: "Check the order confirmation page, confirmation email if enabled, or your account order details." },
        { heading: "What does a receipt include?", body: "Receipts may include order number, item names, quantities, shipping details, taxes, discounts, and total." },
        { heading: "Is a receipt a tax invoice?", body: "Not always. Tax invoice availability depends on region, seller setup, and production readiness." },
        { heading: "Can receipt details change?", body: "Order adjustments, cancellations, or support actions may change the final order record." },
      ]),
    ],
  },
  {
    title: "Products & Printing",
    description: "Prepare designs that look good on real products and understand common print limits.",
    articles: [
      article("print-quality-guide", "Print Quality Guide", "Good print results start with clear artwork, suitable contrast, and careful placement.", [
        { heading: "Use enough resolution", body: "Upload the highest practical resolution. Avoid stretching small images beyond their useful size." },
        { heading: "Check contrast", body: "Low-contrast designs may be hard to see on dark, bright, or textured product colors." },
        { heading: "Keep important details safe", body: "Place faces, text, logos, and fine details away from trim or fold areas." },
        { heading: "Review the preview", body: "Preview mockups are a guide. Materials, lighting, and print processes can affect the final look." },
      ]),
      article("product-variations", "Product Variations", "Product options such as size, color, and material can affect appearance and fit.", [
        { heading: "What are product variations?", body: "Variations are selectable options for the same product, such as size, color, or style." },
        { heading: "Can artwork shift between variations?", body: "Some products have different printable areas. Review each selected variation before checkout." },
        { heading: "Will colors match exactly?", body: "Screen colors and printed colors can differ. Product material and print method also matter." },
        { heading: "How should I choose a size?", body: "Use the product size guide when available and compare measurements before ordering." },
      ]),
      article("color-accuracy", "Color Accuracy", "Color can vary between screens, product materials, and print methods.", [
        { heading: "Why do colors differ?", body: "Screens emit light while printed products reflect light. Brightness, calibration, and material can change perception." },
        { heading: "Can exact color be guaranteed?", body: "No. We avoid promising exact matches unless a specific production workflow supports it." },
        { heading: "How can I improve results?", body: "Use high-contrast colors, avoid very subtle gradients, and review the design on the selected product color." },
        { heading: "What about white or transparent areas?", body: "Transparent areas may show the product color. White ink behavior depends on the print process." },
      ]),
      article("product-size-guide", "Product Size Guide", "Use measurements and product notes to choose the best fit before ordering.", [
        { heading: "Where are sizes shown?", body: "Size options appear on product pages when available. Some items may include measurement details or size charts." },
        { heading: "How should I compare sizes?", body: "Compare listed measurements with a similar item you already own rather than relying only on size labels." },
        { heading: "Can sizes vary slightly?", body: "Yes. Manufacturing and material differences can create small measurement differences." },
        { heading: "Can I exchange for size?", body: "Custom products may have limited size-exchange options. Review the product and after-sales policy before purchase." },
      ]),
    ],
  },
  {
    title: "Shipping & Delivery",
    description: "Learn how shipping methods, timing, carriers, fees, and international delivery work.",
    articles: [
      article("shipping-methods", "Shipping Methods", "Available shipping methods depend on the product, warehouse, destination, and carrier options.", [
        { heading: "How are methods selected?", body: "Checkout shows available methods for the cart and delivery address when shipping options can be calculated." },
        { heading: "Why are some methods unavailable?", body: "A method may not support the product, destination, weight, package size, or current supplier route." },
        { heading: "Can I choose a faster method?", body: "Faster methods may appear when supported. Availability is not guaranteed for every destination." },
        { heading: "Does shipping include production time?", body: "Shipping method estimates may not include product preparation or production time." },
      ]),
      article("delivery-times", "Delivery Times", "Delivery time depends on production, warehouse handoff, carrier movement, and destination processing.", [
        { heading: "When does the estimate start?", body: "Delivery estimates usually begin after an order is prepared and handed to the carrier, not necessarily at checkout." },
        { heading: "Can delivery dates be guaranteed?", body: "No. Weather, customs, carrier workload, and address issues can affect delivery." },
        { heading: "Why did my package pause?", body: "International shipments can pause during export, customs, or local carrier transfer." },
        { heading: "What should I do if it is late?", body: "Check tracking first, then contact support with your order number if the delay looks unusual." },
      ]),
      article("international-shipping", "International Shipping", "International orders may involve cross-border transit, customs review, and local delivery partners.", [
        { heading: "Which countries are supported?", body: "Supported destinations are shown in Shipping Information and may change as supplier logistics updates." },
        { heading: "Can every product ship internationally?", body: "Not always. Product size, material, warehouse, and carrier rules can limit availability." },
        { heading: "Who handles local delivery?", body: "A partner carrier may complete final delivery after the package reaches the destination country or region." },
        { heading: "What if my address format is different?", body: "Enter address details as completely as possible and include a reachable phone number." },
      ]),
      article("customs-duties", "Customs & Duties", "Cross-border orders may be reviewed by customs and may incur duties, taxes, or import fees.", [
        { heading: "Who charges customs fees?", body: "Customs authorities or carriers may collect fees according to destination rules." },
        { heading: "Are duties included at checkout?", body: "They may not be included unless checkout explicitly says they are. Avoid assuming all import costs are prepaid." },
        { heading: "Can customs delay delivery?", body: "Yes. Customs review can add time and may require extra information from the receiver." },
        { heading: "What happens if fees are refused?", body: "The package may be delayed, returned, or abandoned depending on carrier and customs rules." },
      ]),
      article("change-shipping-address", "Change Shipping Address", "Address changes may be possible only before fulfillment or carrier handoff.", [
        { heading: "When should I request a change?", body: "Contact support immediately after noticing an address issue. Include the correct address and order number." },
        { heading: "Why might a change be denied?", body: "The order may already be in production, packed, shipped, or locked by supplier workflow." },
        { heading: "Can carriers change address?", body: "Some carriers offer redirects, but this depends on the carrier, destination, and shipment state." },
        { heading: "How can I avoid address issues?", body: "Review receiver name, phone, postal code, province or state, and country before checkout." },
      ]),
      article("shipping-carriers", "Shipping Carriers", "Carrier options depend on route availability and supplier logistics data.", [
        { heading: "Can I choose a carrier?", body: "Carrier choice may be limited to options shown at checkout or selected by fulfillment routing." },
        { heading: "Why did the carrier change?", body: "A carrier may change due to route availability, service constraints, or supplier fulfillment decisions." },
        { heading: "Where is tracking shown?", body: "Tracking appears on order details after shipment information is returned by the supplier or carrier." },
        { heading: "What if the carrier needs information?", body: "Respond to carrier requests promptly and contact support if you need help understanding the request." },
      ]),
      article("shipping-fee", "Shipping Fee", "Shipping fees are calculated from destination, product, package, and available service details.", [
        { heading: "When is the fee shown?", body: "Checkout displays available shipping options after the delivery address is saved and options can be calculated." },
        { heading: "Why did the fee change?", body: "Changing address, quantity, product options, or shipping method can update the fee." },
        { heading: "Are taxes or duties included?", body: "Only if checkout clearly states they are included. Import fees may be separate for international orders." },
        { heading: "What if no fee appears?", body: "The cart or address may not support available shipping options. Try another address or contact support." },
      ]),
      article("shipping-status", "Shipping Status", "Shipping status shows where the order is in fulfillment and carrier movement.", [
        { heading: "What does processing mean?", body: "The order may be preparing for production, supplier review, packing, or carrier handoff." },
        { heading: "What does shipped mean?", body: "Shipment information has been created or the package has been handed to a carrier." },
        { heading: "Why are there no scans?", body: "Tracking scans can appear after the carrier receives or processes the package." },
        { heading: "What if status seems stuck?", body: "Check the latest tracking event and contact support if there is no movement for an unusual period." },
      ]),
    ],
  },
  {
    title: "Payments & Billing",
    description: "Understand payment methods, payment safety, and taxes or VAT.",
    articles: [
      article("payment-methods", "Payment Methods", "Available payment methods depend on the active checkout provider and buyer region.", [
        { heading: "Which methods are available?", body: "Checkout displays the payment methods currently supported for your cart and region." },
        { heading: "When is payment processed?", body: "Payment behavior depends on the provider. In some staging flows, payment may be authorized but not captured." },
        { heading: "Can I change payment method after ordering?", body: "Usually not after checkout is completed. Contact support if there is a payment issue." },
        { heading: "What if payment fails?", body: "Check card details, billing information, provider messages, and try again if the order has not been placed." },
      ]),
      article("payment-security", "Payment Security", "Payment information is handled through configured payment providers and secure checkout flows.", [
        { heading: "Do you store card details?", body: "Card handling depends on the payment provider integration. Avoid sending card details through support messages." },
        { heading: "How do I spot payment issues?", body: "Use only the official checkout flow and do not follow suspicious payment links outside the platform." },
        { heading: "Why was payment declined?", body: "Declines can happen because of bank rules, insufficient funds, incorrect details, or provider risk checks." },
        { heading: "What should I do after a decline?", body: "Try another supported method or contact your bank. If the order state is unclear, contact support before retrying repeatedly." },
      ]),
      article("taxes-vat", "Taxes & VAT", "Taxes, VAT, and import fees depend on destination, seller setup, and applicable rules.", [
        { heading: "Are taxes shown at checkout?", body: "Checkout may show tax when configured for the region. Some import charges may still be collected separately." },
        { heading: "Can I get a VAT invoice?", body: "Invoice availability depends on seller and regional setup. Contact support if your account needs billing documentation." },
        { heading: "Why did tax change?", body: "Changing shipping address, region, product, or seller configuration can change tax calculation." },
        { heading: "Are customs duties taxes?", body: "Import duties and customs fees are separate from some checkout taxes and may be collected by carriers or authorities." },
      ]),
    ],
  },
  {
    title: "Refund & Replacement",
    description: "Request after-sales review for eligible product, shipment, or package issues.",
    articles: [
      article("after-sales-instructions", "After-sales Instructions", "After-sales requests are reviewed based on order details, evidence, and current policy.", [
        { heading: "When should I contact support?", body: "Contact support when there is a product issue, delivery problem, missing item, or unclear order state." },
        { heading: "What should I provide?", body: "Provide order number, affected item, clear photos, package photos when relevant, and a short explanation." },
        { heading: "Should I discard packaging?", body: "Keep product and packaging until support review is complete, especially for damage or delivery issues." },
        { heading: "Is every request approved?", body: "No. Each request is reviewed and may require supplier or carrier confirmation." },
      ]),
      article("refunds-replacements", "Refunds & Replacements", "Refunds or replacements may be considered after review of the order issue.", [
        { heading: "What outcomes are possible?", body: "Depending on the issue, support may offer guidance, replacement review, partial adjustment, or refund review." },
        { heading: "Does submitting a request guarantee a refund?", body: "No. Submission starts review and is not proof of approval or completed money movement." },
        { heading: "Can custom items be returned?", body: "Custom products may have limited return options unless there is a confirmed product or fulfillment issue." },
        { heading: "How will I receive updates?", body: "Updates may appear in account order details, support messages, or email depending on the workflow." },
      ]),
      article("refund-policy", "Refund Policy", "Refund eligibility depends on order state, product type, issue evidence, and payment-provider constraints.", [
        { heading: "When might a refund be reviewed?", body: "Examples include confirmed product defects, missing items, failed fulfillment, or approved cancellation before fulfillment." },
        { heading: "What is not usually eligible?", body: "Buyer preference changes, incorrect uploaded artwork, wrong size selection, or address mistakes may be limited for custom products." },
        { heading: "How long does refund processing take?", body: "Timing depends on review, approval, and payment provider processing. Do not treat a request as completed refund." },
        { heading: "Where can I see status?", body: "Check order details or support communication for the current request state." },
      ]),
      article("product-abnormality", "Product Abnormality", "Report product abnormalities with clear photos and order details.", [
        { heading: "What counts as abnormal?", body: "Examples may include severe print defects, wrong item, missing component, or product damage not caused by normal handling." },
        { heading: "What photos help?", body: "Provide full product photos, close-ups of the issue, packaging photos, and any labels if relevant." },
        { heading: "Should I keep the item?", body: "Yes. Support may need more photos or supplier review before a resolution is offered." },
        { heading: "Can minor color differences qualify?", body: "Minor screen-to-print color differences may not qualify unless outside accepted production variation." },
      ]),
      article("fragile-items-damaged", "Fragile Items Damaged", "Report damaged fragile items quickly with packaging evidence.", [
        { heading: "What should I photograph?", body: "Photograph the item, outer package, inner protection, shipping label, and damaged area." },
        { heading: "Why packaging matters", body: "Packaging evidence helps support determine whether the issue relates to production, packing, or carrier handling." },
        { heading: "Can I throw away damaged items?", body: "Keep damaged items and packaging until support confirms the review is complete." },
        { heading: "What resolution is possible?", body: "Resolution depends on review results and may involve replacement or refund review where eligible." },
      ]),
      article("package-return-abnormality", "Package Return Abnormality", "Returned, undeliverable, or refused packages require case-by-case review.", [
        { heading: "Why packages are returned", body: "Common reasons include incomplete address, failed delivery attempts, customs refusal, unpaid fees, or carrier restrictions." },
        { heading: "What should I do first?", body: "Check tracking details and contact the carrier if local action is available." },
        { heading: "Can a returned package be resent?", body: "Reshipment depends on package condition, supplier policy, carrier rules, and updated address confirmation." },
        { heading: "Who pays extra fees?", body: "Extra fees depend on the return reason and policy review. They are not automatically waived." },
      ]),
    ],
  },
  {
    title: "AI Design Tools",
    description: "Use AI tools responsibly for prompts, artwork, policies, and commercial designs.",
    articles: [
      article("ai-image-generator", "AI Image Generator", "The AI image generator can help create design ideas for customizable products.", [
        { heading: "What can I create?", body: "Use prompts for patterns, illustrations, slogans, themes, or product artwork concepts." },
        { heading: "What should I avoid?", body: "Avoid prohibited content, private personal data, protected characters, trademarks, or content you cannot lawfully use." },
        { heading: "Do I need to review outputs?", body: "Yes. Check quality, text accuracy, policy fit, and print readiness before using the result." },
        { heading: "Can outputs be used commercially?", body: "Commercial use depends on applicable law, platform policy, and your rights to the prompt and final design." },
      ]),
      article("ai-prompt-guide", "AI Prompt Guide", "Better prompts usually describe subject, style, composition, colors, and restrictions.", [
        { heading: "Start with the subject", body: "Name the main object, character type, scene, or message you want in the artwork." },
        { heading: "Add style and mood", body: "Mention style words such as minimal, playful, vintage, bold, watercolor, or geometric." },
        { heading: "Control layout", body: "Describe whether the design should be centered, repeating, badge-shaped, full-bleed, or text-free." },
        { heading: "Refine in steps", body: "Generate a draft, review issues, then adjust the prompt with more specific guidance." },
      ]),
      article("ai-content-policy", "AI Content Policy", "AI-generated content must still follow platform rules and applicable law.", [
        { heading: "Who is responsible?", body: "The person creating or publishing a design is responsible for reviewing whether it is appropriate to use." },
        { heading: "What content may be restricted?", body: "Restrictions may apply to hateful, unsafe, illegal, deceptive, sexually explicit, infringing, or privacy-invasive content." },
        { heading: "Can content be removed?", body: "Yes. Designs may be rejected, unpublished, or reviewed if they violate policy or rights." },
        { heading: "How do I report a concern?", body: "Use contact or takedown request channels with specific product, store, or design information." },
      ]),
      article("commercial-use-ai-images", "Commercial Use of AI Images", "AI images may require extra review before use on products for sale.", [
        { heading: "Is commercial use automatic?", body: "No. Commercial use depends on the tool terms, local law, rights clearance, and platform policy." },
        { heading: "What should sellers check?", body: "Check whether the design includes protected brands, characters, likenesses, logos, or copyrighted elements." },
        { heading: "Can similar outputs exist?", body: "AI tools can generate similar concepts for different users. Avoid relying on uniqueness without additional review." },
        { heading: "When should I seek advice?", body: "For campaigns, brand-sensitive products, or high-risk content, get appropriate legal or rights guidance before publishing." },
      ]),
    ],
  },
  {
    title: "Copyright & Legal",
    description: "Understand copyright, takedowns, trademarks, and acceptable use at a practical level.",
    articles: [
      article("copyright-policy", "Copyright Policy", "Respect copyright and only upload or publish content you have the right to use.", [
        { heading: "What is copyrighted?", body: "Artwork, photos, text, characters, logos, and designs can be protected even when found online." },
        { heading: "Can I use fan art?", body: "Fan art may still infringe another party's rights. Permission or a valid license may be required." },
        { heading: "What happens after a complaint?", body: "Content may be reviewed, removed, or restricted while a rights issue is evaluated." },
        { heading: "How do I avoid issues?", body: "Use original work, licensed assets, public-domain materials you verify, or content with clear permission." },
      ]),
      article("takedown-requests", "Takedown Requests", "Rights holders can request review of content they believe infringes their rights.", [
        { heading: "What should a request include?", body: "Include the content location, rights claimed, contact details, and enough information to evaluate the request." },
        { heading: "What happens next?", body: "The platform may review, remove, restrict, or ask for more information depending on the request." },
        { heading: "Can a seller respond?", body: "A seller may be asked for information or may use a dispute process if one is available." },
        { heading: "Is this legal advice?", body: "No. For legal questions, consult a qualified professional." },
      ]),
      article("trademark-policy", "Trademark Policy", "Avoid using names, logos, slogans, or brand identifiers that could confuse buyers.", [
        { heading: "What is a trademark issue?", body: "A trademark issue may occur when a design suggests affiliation, endorsement, or origin that is not true." },
        { heading: "Can I mention a brand?", body: "Brand references can be risky, especially on products for sale. Use only when you have rights or a clear permitted use." },
        { heading: "What about parody?", body: "Parody rules vary and can be complex. Do not assume a design is allowed because it is humorous." },
        { heading: "What happens to reported products?", body: "Reported products may be reviewed, restricted, or removed depending on the circumstances." },
      ]),
      article("acceptable-use-policy", "Acceptable Use Policy", "Use the platform in a way that is lawful, respectful, and safe for buyers, sellers, and creators.", [
        { heading: "What behavior is not allowed?", body: "Do not use the platform for fraud, abuse, harassment, illegal products, rights violations, or unsafe content." },
        { heading: "What content is restricted?", body: "Content may be restricted if it is hateful, explicit, deceptive, dangerous, infringing, or privacy-invasive." },
        { heading: "Can accounts be limited?", body: "Accounts, stores, products, or orders may be limited when there is policy, safety, or legal risk." },
        { heading: "How are decisions made?", body: "Reviews may use order data, product data, user reports, supplier feedback, and platform policy." },
      ]),
    ],
  },
  {
    title: "Cookie",
    description: "Understand how browser storage and cookies support account, cart, and site behavior.",
    articles: [
      article("cookie-policy", "Cookie Policy", "Cookies and local storage help the storefront remember sessions, carts, and preferences.", [
        { heading: "What are cookies?", body: "Cookies are small browser records that can help keep you signed in or remember site state." },
        { heading: "What is local storage?", body: "Local storage can save non-sensitive app state such as cart identifiers or preferences in your browser." },
        { heading: "Can I clear cookies?", body: "Yes, but clearing browser data may sign you out, remove local cart references, or reset preferences." },
        { heading: "Do cookies handle payment details?", body: "Payment details should be handled through the payment provider, not through ordinary help-center cookies." },
      ]),
    ],
  },
]

export const HELP_ARTICLES = HELP_CATEGORIES.flatMap((category) =>
  category.articles.map((entry) => ({ ...entry, category: category.title }))
)

export type HelpArticleWithCategory = HelpArticle & { category: string }

export const findHelpArticle = (slug: string): HelpArticleWithCategory | undefined =>
  HELP_ARTICLES.find((entry) => entry.slug === slug)
