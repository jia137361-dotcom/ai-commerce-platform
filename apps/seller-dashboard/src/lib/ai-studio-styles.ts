export type AiStudioStylePreset = {
  id: string
  label: string
  description: string
  emoji: string
  promptSuffix: string
}

export const AI_STUDIO_STYLE_PRESETS: AiStudioStylePreset[] = [
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean lines, simple shapes, limited palette",
    emoji: "◻️",
    promptSuffix:
      "minimalist flat illustration, clean geometric shapes, limited color palette, modern and uncluttered, print-ready artwork",
  },
  {
    id: "vintage",
    label: "Vintage",
    description: "Retro poster feel, warm muted tones",
    emoji: "📻",
    promptSuffix:
      "vintage retro poster aesthetic, distressed texture, warm muted tones, classic screen-print style, print-ready artwork",
  },
  {
    id: "kawaii",
    label: "Kawaii",
    description: "Cute, soft, pastel and friendly",
    emoji: "🐼",
    promptSuffix:
      "kawaii cute illustration, soft pastel colors, rounded friendly shapes, cheerful mood, print-ready artwork",
  },
  {
    id: "street",
    label: "Street",
    description: "Bold urban graphic, high contrast",
    emoji: "🔥",
    promptSuffix:
      "bold streetwear graphic, high contrast, urban contemporary style, dynamic composition, print-ready artwork",
  },
]

export const buildStyledArtworkPrompt = (prompt: string, style: AiStudioStylePreset) => {
  const subject = prompt.trim()
  if (!subject) return ""
  return `${subject}. ${style.promptSuffix}`
}
