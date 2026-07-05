import { describe, expect, it } from "vitest"
import { AI_STUDIO_STYLE_PRESETS, buildStyledArtworkPrompt } from "./ai-studio-styles"

describe("buildStyledArtworkPrompt", () => {
  it("combines subject prompt with selected style suffix", () => {
    const style = AI_STUDIO_STYLE_PRESETS.find((item) => item.id === "kawaii")!
    expect(buildStyledArtworkPrompt("A panda eating cake", style)).toContain("A panda eating cake")
    expect(buildStyledArtworkPrompt("A panda eating cake", style)).toContain("kawaii")
  })

  it("returns empty string for blank prompt", () => {
    expect(buildStyledArtworkPrompt("  ", AI_STUDIO_STYLE_PRESETS[0])).toBe("")
  })
})
