import { useEffect, useMemo, useRef, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import {
  fetchBuyerAiJob,
  fetchBuyerAiMaterials,
  fetchBuyerPlan,
  startBuyerAiGenerate,
  type BuyerAiJobResult,
  type BuyerAiMaterial,
  type BuyerPlanSnapshot,
} from "../../lib/buyer-api"
import {
  buildStudioEditorHref,
  setPendingStudioMaterial,
} from "../../lib/buyer-design-handoff"
import { getBuyerDesignGuestKey } from "../../lib/buyer-my-designs"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { useBuyerLocale } from "../../lib/locale"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"
import { useBuyerAuth } from "../../auth/useBuyerAuth"

type AiDesignPageProps = {
  cartCount: number
  productIdFromPath?: string
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

export function AiDesignPage({ cartCount, productIdFromPath }: AiDesignPageProps) {
  const { t } = useBuyerLocale()
  const auth = useBuyerAuth()
  const customerId = auth.customer?.id ?? null
  const materialGuestKey = () => getBuyerDesignGuestKey()
  const { settings } = useBuyerPageSettings()
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const productId = (productIdFromPath || search.get("productId") || "").trim()
  const returnTo = (search.get("returnTo") || "").trim()

  const [prompt, setPrompt] = useState("")
  const [selectedStyle, setSelectedStyle] = useState("kawaii")
  const [isGenerating, setIsGenerating] = useState(false)
  const [job, setJob] = useState<BuyerAiJobResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [library, setLibrary] = useState<BuyerAiMaterial[]>([])
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [plan, setPlan] = useState<BuyerPlanSnapshot | null>(null)
  const pollRef = useRef<number | null>(null)

  const selectedStyleObj = DESIGN_STYLES.find((s) => s.id === selectedStyle)

  const refreshLibrary = async () => {
    setLibraryLoading(true)
    const result = await fetchBuyerAiMaterials(materialGuestKey())
    setLibrary(result.data)
    if (result.error) setError((current) => current ?? result.error ?? null)
    setLibraryLoading(false)
  }

  const refreshPlan = async () => {
    if (!auth.customer) {
      setPlan(null)
      return
    }
    try {
      const result = await fetchBuyerPlan()
      setPlan(result.plan)
    } catch {
      setPlan(null)
    }
  }

  useEffect(() => {
    enterLegacyDefaultStoreContext()
    void refreshLibrary()
    void refreshPlan()
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [customerId])

  const previewUrl =
    job?.designImageUrl || job?.materialUrl || job?.mockupImageUrl

  const materialThumbUrl = (material: BuyerAiMaterial) =>
    material.designImageUrl ||
    material.materialUrl ||
    material.printFileUrl ||
    material.mockupImageUrl ||
    ""

  const studioHref = useMemo(() => {
    if (job?.editorPath) return job.editorPath
    if (productId && job?.materialId) return buildStudioEditorHref(productId, job.materialId)
    if (productId) return buildStudioEditorHref(productId)
    return "/studio"
  }, [job, productId])

  const pollJob = (jobId: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current)
    pollRef.current = window.setInterval(() => {
      void (async () => {
        try {
          const next = await fetchBuyerAiJob(jobId, materialGuestKey())
          setJob(next)
          if (next.status === "complete" || next.status === "failed") {
            if (pollRef.current) window.clearInterval(pollRef.current)
            pollRef.current = null
            setIsGenerating(false)
            if (next.status === "failed") {
              setError(next.error || "AI generation failed")
              return
            }
            await refreshLibrary()
          }
        } catch (err) {
          if (pollRef.current) window.clearInterval(pollRef.current)
          pollRef.current = null
          setIsGenerating(false)
          setError(err instanceof Error ? err.message : "Failed to poll AI job")
        }
      })()
    }, 2000)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a design description")
      return
    }

    if (auth.customer && plan && !plan.canUseAi) {
      setError("No AI image credits remaining. Upgrade your plan to continue.")
      return
    }

    setIsGenerating(true)
    setError(null)
    setJob(null)

    try {
      const fullPrompt = prompt + (selectedStyleObj?.promptSuffix ?? "")
      const started = await startBuyerAiGenerate({
        productId: productId || null,
        prompt: fullPrompt,
        stylePreset: selectedStyle,
        guestKey: materialGuestKey(),
      })
      setJob(started)
      void refreshPlan()
      pollJob(started.jobId)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate design"
      setError(message)
      setIsGenerating(false)
      if (/credit|upgrade|402/i.test(message)) void refreshPlan()
    }
  }

  const sendMaterialToStudio = (material: BuyerAiMaterial) => {
    const targetProductId = productId || material.productId || ""
    if (material.materialId && targetProductId) {
      if (returnTo) {
        const url = new URL(returnTo, window.location.origin)
        url.searchParams.set("materialId", material.materialId)
        navigateBuyer(`${url.pathname}${url.search}${url.hash}`)
      } else {
        navigateBuyer(buildStudioEditorHref(targetProductId, material.materialId))
      }
      return
    }
    if (material.materialId || material.designImageUrl) {
      if (material.materialId) {
        setPendingStudioMaterial({
          materialId: material.materialId,
          designImageUrl: material.designImageUrl,
          title: material.title,
          prompt: material.prompt,
        })
      }
      navigateBuyer("/studio")
      return
    }
    setError("This material is not ready for Studio yet.")
  }

  const openCompletedInStudio = () => {
    if (!job) return
    if (returnTo && job.materialId) {
      const url = new URL(returnTo, window.location.origin)
      url.searchParams.set("materialId", job.materialId)
      navigateBuyer(`${url.pathname}${url.search}${url.hash}`)
      return
    }
    if (productId) {
      navigateBuyer(studioHref)
      return
    }
    if (job.materialId) {
      setPendingStudioMaterial({
        materialId: job.materialId,
        designImageUrl: job.designImageUrl,
        title: job.title,
        prompt,
      })
    }
    navigateBuyer("/studio")
  }

  return (
    <PageShell
      className="buyer-ai-studio-page"
      contentClassName="buyer-ai-studio-content"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StoreFooter />}
      cartCount={cartCount}
    >
      <div className="buyer-ai-studio-container">
        <div className="buyer-ai-studio-header">
          <p className="buyer-studio-landing-kicker">{t("aiDesignKicker")}</p>
          <h1>{t("aiDesignTitle")}</h1>
          <p>{t("aiDesignDescription")}</p>
          {plan ? (
            <p className="buyer-ai-plan-chip">
              {plan.planName}: {plan.aiCreditsRemaining}/{plan.aiCreditsMonthly} AI credits ·{" "}
              <a href="/plans">{plan.canUseAi ? "Manage plan" : "Upgrade"}</a>
            </p>
          ) : auth.customer ? null : (
            <p className="buyer-ai-plan-chip">
              Sign in to use plan credits. <a href={`/account/sign-in?returnTo=${encodeURIComponent("/ai-design")}`}>Sign in</a>{" "}
              · <a href="/plans">View plans</a>
            </p>
          )}
          {returnTo || productId ? (
            <p>
              <a href={returnTo || (productId ? buildStudioEditorHref(productId) : "/studio")}>
                {t("aiDesignBackToStudio")}
              </a>
            </p>
          ) : null}
        </div>

        <div className="buyer-ai-studio-grid">
          <div className="buyer-ai-studio-form">
            <Card className="buyer-ai-studio-card">
              <h2>{t("aiDesignTitle")}</h2>
              <p className="buyer-ai-studio-hint">{t("aiDesignGenerateHint")}</p>

              <div className="buyer-ai-studio-prompt-area">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Example: A cute cat wearing sunglasses, sitting on a rainbow, pastel colors..."
                  className="buyer-ai-studio-textarea"
                  rows={4}
                  disabled={isGenerating}
                  maxLength={500}
                />
                <span className="buyer-ai-studio-char-count">{prompt.length}/500</span>
              </div>

              <h3>Select Style</h3>
              <div className="buyer-ai-studio-styles">
                {DESIGN_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    className={`buyer-ai-style-button ${selectedStyle === style.id ? "selected" : ""}`}
                    onClick={() => setSelectedStyle(style.id)}
                    disabled={isGenerating}
                  >
                    <strong>{style.name}</strong>
                    <span>{style.description}</span>
                  </button>
                ))}
              </div>

              <Button
                className="buyer-ai-studio-generate-button"
                loading={isGenerating}
                disabled={!prompt.trim() || isGenerating || Boolean(auth.customer && plan && !plan.canUseAi)}
                onClick={() => void handleGenerate()}
              >
                {isGenerating
                  ? `Generating… ${job?.progress ?? 0}%`
                  : auth.customer && plan && !plan.canUseAi
                    ? "Upgrade to generate"
                    : "Generate image"}
              </Button>

              {auth.customer && plan && !plan.canUseAi ? (
                <p className="buyer-ai-studio-error">
                  Credits exhausted. <a href="/plans">Upgrade to AI Creative</a> for more monthly credits.
                </p>
              ) : null}

              {error ? <p className="buyer-ai-studio-error">{error}</p> : null}

              {job?.status === "complete" && previewUrl ? (
                <div className="buyer-ai-studio-result">
                  <h3>{job.title || "Saved to your materials"}</h3>
                  {job.mockMode ? (
                    <p className="buyer-ai-studio-error" role="status">
                      Placeholder image only — AI Worker is in mock mode. Restart worker with
                      AI_WORKER_MOCK_GENERATION=false to generate real artwork.
                    </p>
                  ) : null}
                  <img src={previewUrl} alt="AI artwork preview" className="buyer-ai-studio-result-image" />
                  <button type="button" className="buyer-ai-studio-editor-link" onClick={openCompletedInStudio}>
                    {t("aiDesignOpenStudio")}
                  </button>
                </div>
              ) : null}
            </Card>
          </div>

          <div className="buyer-ai-studio-sidebar">
            <div id="ai-materials">
            <Card className="buyer-ai-studio-info-card">
              <h3>{t("aiDesignLibraryTitle")}</h3>
              {libraryLoading ? <p>{t("catalogLoading")}</p> : null}
              {!libraryLoading && !library.length ? (
                <p>{t("aiDesignLibraryEmpty")}</p>
              ) : (
                <ul className="buyer-ai-design-library">
                  {library.map((material) => {
                    const thumb = materialThumbUrl(material)
                    return (
                    <li key={material.id}>
                      {thumb ? (
                        <img src={thumb} alt="" />
                      ) : (
                        <div className="buyer-ai-design-library-empty-thumb" aria-hidden="true" />
                      )}
                      <div>
                        <strong>{material.title || material.prompt || material.id}</strong>
                        {material.mockMode ? <span className="buyer-ai-design-mock-badge">mock</span> : null}
                        <button type="button" onClick={() => sendMaterialToStudio(material)}>
                          {t("aiDesignOpenStudio")}
                        </button>
                      </div>
                    </li>
                    )
                  })}
                </ul>
              )}
            </Card>
            </div>

            <Card className="buyer-ai-studio-tips-card">
              <h3>Tips</h3>
              <ul>
                <li>Image generation only — no language model</li>
                <li>Results are saved to your AI materials library</li>
                <li>Send a material into Studio to place it on a blank</li>
              </ul>
            </Card>

            <a href="/studio" className="buyer-ai-studio-back-link">
              ← {t("navStudio")}
            </a>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
