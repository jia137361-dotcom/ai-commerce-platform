import { useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"

type BuyerAiStudioPageProps = {
  productId: string
  cartCount: number
}

type DesignStyle = {
  id: string
  name: string
  description: string
  promptSuffix: string
}

const DESIGN_STYLES: DesignStyle[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean lines, limited palette, simple shapes",
    promptSuffix: ", minimal design, clean lines, limited palette, simple shapes, modern aesthetic",
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Retro poster style, warm muted tones",
    promptSuffix: ", vintage poster style, retro aesthetic, warm muted tones, distressed texture",
  },
  {
    id: "kawaii",
    name: "Kawaii",
    description: "Cute pastel illustration, rounded characters",
    promptSuffix: ", kawaii style, cute pastel colors, rounded characters, soft illustration",
  },
  {
    id: "street",
    name: "Street",
    description: "Bold urban graphic, high contrast",
    promptSuffix: ", street art style, bold urban graphic, high contrast, graffiti inspired",
  },
]

export function BuyerAiStudioPage({ productId, cartCount }: BuyerAiStudioPageProps) {
  const auth = useBuyerAuth()
  const { settings } = useBuyerPageSettings({ marketplace: true })
  const [prompt, setPrompt] = useState("")
  const [selectedStyle, setSelectedStyle] = useState<string>("kawaii")
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<{ designUrl?: string; message?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedStyleObj = DESIGN_STYLES.find((s) => s.id === selectedStyle)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a design description")
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const fullPrompt = prompt + (selectedStyleObj?.promptSuffix ?? "")

      const response = await fetch(`${import.meta.env.VITE_MEDUSA_URL || "http://localhost:9000"}/admin/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Store-Id": localStorage.getItem("buyer_store_id") || "default_store",
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          platform_product_id: "pp_tshirt",
          supplier_product_id: "sp_tshirt",
          print_position: "front",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to start AI generation")
      }

      const data = await response.json()
      setResult({
        message: `Design generation started! Job ID: ${data.id || "pending"}`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate design")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <PageShell
      className="buyer-ai-studio-page"
      contentClassName="buyer-ai-studio-content"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StoreFooter />}
    >
      <div className="buyer-ai-studio-container">
        <div className="buyer-ai-studio-header">
          <h1>AI Design Studio</h1>
          <p>Create unique designs with AI for this product</p>
        </div>

        <div className="buyer-ai-studio-grid">
          <div className="buyer-ai-studio-form">
            <Card className="buyer-ai-studio-card">
              <h2>Describe Your Design</h2>
              <p className="buyer-ai-studio-hint">
                Describe the subject, style, colors, and mood you want. Be specific for better results.
              </p>

              <div className="buyer-ai-studio-prompt-area">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Example: A cute cat wearing sunglasses, sitting on a rainbow, pastel colors..."
                  className="buyer-ai-studio-textarea"
                  rows={4}
                  disabled={isGenerating}
                />
                <span className="buyer-ai-studio-char-count">{prompt.length}/500</span>
              </div>

              <h3>Select Style</h3>
              <div className="buyer-ai-studio-styles">
                {DESIGN_STYLES.map((style) => (
                  <button
                    key={style.id}
                    className={`buyer-ai-style-button ${selectedStyle === style.id ? "selected" : ""}`}
                    onClick={() => setSelectedStyle(style.id)}
                    disabled={isGenerating}
                  >
                    <strong>{style.name}</strong>
                    <span>{style.description}</span>
                  </button>
                ))}
              </div>

              <div className="buyer-ai-studio-preview">
                <h3>Preview Prompt</h3>
                <p className="buyer-ai-studio-preview-text">
                  {prompt || "Your prompt will appear here..."}
                  {selectedStyleObj?.promptSuffix && prompt ? selectedStyleObj.promptSuffix : ""}
                </p>
              </div>

              <Button
                className="buyer-ai-studio-generate-button"
                loading={isGenerating}
                disabled={!prompt.trim() || isGenerating}
                onClick={() => void handleGenerate()}
              >
                {isGenerating ? "Generating..." : "Generate Design"}
              </Button>

              {error && <p className="buyer-ai-studio-error">{error}</p>}
              {result && <p className="buyer-ai-studio-success">{result.message}</p>}
            </Card>
          </div>

          <div className="buyer-ai-studio-sidebar">
            <Card className="buyer-ai-studio-info-card">
              <h3>How it works</h3>
              <ol>
                <li>Describe your design idea</li>
                <li>Choose a style preset</li>
                <li>Click "Generate Design"</li>
                <li>AI creates your unique artwork</li>
                <li>Review and add to cart</li>
              </ol>
            </Card>

            <Card className="buyer-ai-studio-tips-card">
              <h3>Tips for better results</h3>
              <ul>
                <li>Be specific about colors and mood</li>
                <li>Mention the subject clearly</li>
                <li>Avoid describing the garment</li>
                <li>Use style keywords like "cute", "bold", "vintage"</li>
              </ul>
            </Card>

            <a href={`/products/${productId}`} className="buyer-ai-studio-back-link">
              ← Back to Product
            </a>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
