import type { InfoDocument } from "./types"

export const aboutDocument: InfoDocument = {
  title: "About Ciiverse",
  sections: [
    {
      title: "Who we are",
      paragraphs: [
        "Ciiverse is an AI-native print-on-demand commerce platform that enables users to create, customize, and deliver personalized products globally. Ciiverse helps individuals, creators, and businesses turn ideas into personalized products.",
        "The platform integrates AI image generation, user-generated content workflows, product customization technology, and manufacturing partners to streamline the creation and fulfillment of custom merchandise.",
      ],
    },
    {
      title: "Our vision",
      paragraphs: [
        "Our vision is to become an AI-native and AI-empowered manufacturing commerce platform, allowing anyone to transform digital creativity into physical products without managing inventory, production, or logistics.",
      ],
    },
    {
      title: "Where we operate",
      paragraphs: [
        "Headquartered in Hong Kong, Ciiverse serves creators, entrepreneurs, online merchants, and businesses worldwide.",
      ],
      links: [
        { label: "ciiverse.com", href: "https://www.ciiverse.com" },
        { label: "Help Center", href: "/help" },
      ],
    },
  ],
}
