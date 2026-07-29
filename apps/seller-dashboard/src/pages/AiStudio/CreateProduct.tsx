import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import {
  AI_STUDIO_STYLE_PRESETS,
  buildStyledArtworkPrompt,
  type AiStudioStylePreset,
} from "../../lib/ai-studio-styles"
import {
  formatSupplierVariantLabel,
  pickPreferredWhiteTee,
  type SupplierProductRow,
} from "../../lib/ai-studio-supplier"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { Label, Textarea } from "../../components/ui/Input"
import { cn } from "../../lib/cn"

const GARMENT_HINT =
  /\b(t-?shirts?|tee|hoodie|mug|wearing|inside a|mockup|mannequin|printed on)\b/i

const MARKETPLACE_CATEGORY = {
  id: "clothing_shoes_jewelry",
  label: "Clothing, Shoes & Jewelry",
}

export function CreateProductPage() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState("")
  const [styleId, setStyleId] = useState(AI_STUDIO_STYLE_PRESETS[2].id)
  const [supplierProductId, setSupplierProductId] = useState("")
  const [supplierVariantId, setSupplierVariantId] = useState("")
  const [loading, setLoading] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedStyle = useMemo(
    () => AI_STUDIO_STYLE_PRESETS.find((style) => style.id === styleId) ?? AI_STUDIO_STYLE_PRESETS[0],
    [styleId]
  )

  const { data: supplierData, isLoading: suppliersLoading } = useQuery({
    queryKey: ["supplier-products-all"],
    queryFn: () =>
      apiFetch<{ supplier_products: SupplierProductRow[] }>("/admin/supplier-products"),
    staleTime: 0,
    refetchOnMount: "always",
  })

  const supplierProducts = useMemo(() => {
    const rows = supplierData?.supplier_products ?? []
    return [...rows].sort((a, b) => {
      const aS2b = a.basic_product_id ? 0 : 1
      const bS2b = b.basic_product_id ? 0 : 1
      if (aS2b !== bS2b) return aS2b - bS2b
      const aMock = a.supplier_id === "sup_citigoo_mock" ? 1 : 0
      const bMock = b.supplier_id === "sup_citigoo_mock" ? 1 : 0
      if (aMock !== bMock) return aMock - bMock
      return a.name.localeCompare(b.name)
    })
  }, [supplierData])

  const preferredWhiteTee = useMemo(
    () => pickPreferredWhiteTee(supplierProducts),
    [supplierProducts]
  )

  const selectedSupplier = supplierProducts.find(
    (row) => row.supplier_product_id === supplierProductId
  )

  useEffect(() => {
    if (!preferredWhiteTee?.product) return
    setSupplierProductId(preferredWhiteTee.product.supplier_product_id)
    if (preferredWhiteTee.variant) {
      setSupplierVariantId(preferredWhiteTee.variant.supplier_variant_id)
    }
  }, [preferredWhiteTee])

  useEffect(() => {
    if (!selectedSupplier?.variants?.length) return
    const exists = selectedSupplier.variants.some(
      (variant) => variant.supplier_variant_id === supplierVariantId
    )
    if (!exists) {
      setSupplierVariantId(selectedSupplier.variants[0].supplier_variant_id)
    }
  }, [selectedSupplier, supplierVariantId])

  const promptMentionsGarment = GARMENT_HINT.test(prompt)
  const styledPromptPreview = buildStyledArtworkPrompt(prompt, selectedStyle)

  const startGeneration = async (style: AiStudioStylePreset) => {
    if (!prompt.trim()) {
      setError("Describe your artwork idea first.")
      return false
    }
    if (!supplierProductId || !supplierVariantId || !selectedSupplier) {
      setError("White T-shirt fulfillment base is not ready. Sync S2BDIY basic product or run seed.")
      return false
    }

    const artworkPrompt = buildStyledArtworkPrompt(prompt, style)
    const res = await apiFetch<{ job_id: string }>("/admin/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: artworkPrompt,
        platform_product_id: selectedSupplier.platform_product_id ?? "pp_tshirt",
        supplier_product_id: supplierProductId,
        supplier_variant_id: supplierVariantId,
        print_position: "front",
        marketplace_category: MARKETPLACE_CATEGORY.id,
        marketplace_category_label: MARKETPLACE_CATEGORY.label,
        style_preset: style.id,
        style_preset_label: style.label,
      }),
    })

    navigate(`/ai-studio/progress/${res.job_id}`, {
      state: {
        prompt: prompt.trim(),
        styledPrompt: artworkPrompt,
        styleLabel: style.label,
        productName: selectedSupplier.name,
        marketplaceCategory: MARKETPLACE_CATEGORY.label,
      },
    })
    return true
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await startGeneration(selectedStyle)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start generation")
    } finally {
      setLoading(false)
    }
  }

  const createManualDraft = async () => {
    setManualLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ product_id: string }>("/admin/products/draft", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled Product",
          description: "",
          price: 24.99,
          cost: 0,
          source: "manual",
          variants: [
            {
              supplier_variant_id: `manual-${Date.now()}`,
              color: "Default",
              size: "Default",
              price: 24.99,
              supplier_sku: "MANUAL-DEFAULT",
              enabled: true,
            },
          ],
          metadata: {
            is_own_product: true,
            fulfillment_mode: "self_managed",
            logistics_mode: "self_managed",
            requires_shipping: true,
            image_urls: [],
            marketplace_category: MARKETPLACE_CATEGORY.id,
            marketplace_category_label: MARKETPLACE_CATEGORY.label,
            style_preset: selectedStyle.id,
            style_preset_label: selectedStyle.label,
          },
        }),
      })
      navigate(`/products/${res.product_id}/edit`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create blank draft")
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <Link to="/products" className="text-sm text-slate-500 hover:text-brand">
          ← Back to products
        </Link>
        <h1 className="mt-2 text-3xl font-bold">AI Studio</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Create personalized white T-shirt designs for your store. Pick a style, describe your
          artwork, and we&apos;ll generate print-ready art plus mockups for the product editor.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <Label>Fulfillment base</Label>
            <p className="mt-1 text-sm text-slate-500">
              Optimized for white T-shirt POD. S2BDIY blanks are preferred for live fulfillment.
            </p>
            {suppliersLoading ? (
              <p className="mt-3 text-sm text-slate-400">Loading catalog…</p>
            ) : selectedSupplier && supplierVariantId ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <p className="font-semibold">
                  {selectedSupplier.basic_product_id ? "S2BDIY" : "Catalog"} · {selectedSupplier.name}
                </p>
                <p className="mt-1 text-emerald-800">
                  Variant:{" "}
                  {formatSupplierVariantLabel(
                    selectedSupplier.variants.find(
                      (variant) => variant.supplier_variant_id === supplierVariantId
                    ) ?? selectedSupplier.variants[0]
                  )}
                </p>
                {selectedSupplier.basic_product_id ? (
                  <p className="mt-1 text-xs text-emerald-700">
                    basic_product_id: {selectedSupplier.basic_product_id}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-amber-800">
                    No S2BDIY blank linked yet. Run{" "}
                    <code className="rounded bg-white px-1">POST /admin/supplier-products/sync-basic-product</code>{" "}
                    to enable production fulfillment.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-amber-700">
                No supplier products found. Run backend seed or sync S2BDIY basic product 1672.
              </p>
            )}

            {supplierProducts.length > 1 ? (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-slate-500">Advanced: change blank</summary>
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={supplierProductId}
                  onChange={(event) => setSupplierProductId(event.target.value)}
                >
                  {supplierProducts.map((row) => (
                    <option key={row.supplier_product_id} value={row.supplier_product_id}>
                      {row.basic_product_id ? "[S2B]" : "[Mock]"} {row.name}
                    </option>
                  ))}
                </select>
                {selectedSupplier?.variants?.length ? (
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={supplierVariantId}
                    onChange={(event) => setSupplierVariantId(event.target.value)}
                  >
                    {selectedSupplier.variants.map((variant) => (
                      <option key={variant.supplier_variant_id} value={variant.supplier_variant_id}>
                        {formatSupplierVariantLabel(variant)}
                      </option>
                    ))}
                  </select>
                ) : null}
              </details>
            ) : null}
          </Card>

          <Card>
            <Label>Pick a starting style</Label>
            <p className="mt-1 text-sm text-slate-500">
              Choose one of four built-in directions. Your prompt below describes the subject; the
              style shapes color and mood.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {AI_STUDIO_STYLE_PRESETS.map((style) => {
                const active = style.id === styleId
                return (
                  <button
                    key={style.id}
                    type="button"
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition",
                      active
                        ? "border-brand bg-brand-light ring-2 ring-brand/30"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                    onClick={() => setStyleId(style.id)}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {style.emoji}
                    </span>
                    <p className="mt-2 font-semibold text-slate-900">{style.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{style.description}</p>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card>
            <Label>Artwork prompt</Label>
            <p className="mt-1 text-sm text-slate-500">
              Describe the <strong>design only</strong> — subject, scene, mood. Don&apos;t mention
              T-shirt or mockup; we handle the blank and previews.
            </p>
            <Textarea
              className="mt-3"
              rows={5}
              maxLength={500}
              placeholder="Example: A fluffy panda eating a bamboo-shaped birthday cake, cheerful expression, no text."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <p className="mt-1 text-right text-xs text-slate-400">{prompt.length}/500</p>
            {promptMentionsGarment ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Your prompt mentions a garment or mockup. We&apos;ll focus on artwork only and apply
                it to the white tee blank automatically.
              </p>
            ) : null}
            {styledPromptPreview ? (
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <p className="font-semibold uppercase tracking-wide text-slate-400">AI will receive</p>
                <p className="mt-1 leading-relaxed">{styledPromptPreview}</p>
              </div>
            ) : null}
          </Card>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || manualLoading || !supplierProducts.length}
          >
            {loading ? "Starting generation…" : `Generate with ${selectedStyle.label} style →`}
          </Button>

          <div
            id="manual-draft"
            className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center scroll-mt-24"
          >
            <p className="text-sm text-slate-600">Skip AI and build the listing manually?</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              disabled={loading || manualLoading || !supplierProducts.length}
              onClick={() => void createManualDraft()}
            >
              {manualLoading ? "Creating…" : "Create blank draft"}
            </Button>
          </div>
        </div>

        <Card className="h-fit space-y-4 bg-gradient-to-br from-brand-light/40 to-white">
          <div className="text-center">
            <div className="text-4xl">👕</div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">White tee workflow</h3>
            <p className="mt-2 text-sm text-slate-600">
              Style → AI artwork → mockups → edit listing → S2BDIY fulfillment on publish.
            </p>
          </div>
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-2">
              <span className="font-semibold text-brand">1.</span>
              <span>Pick one of four style presets</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-brand">2.</span>
              <span>AI generates print art + front/back/on-body previews</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-brand">3.</span>
              <span>Review in product editor, set price & regions</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-brand">4.</span>
              <span>Publish — S2BDIY quickCreate runs when configured</span>
            </li>
          </ol>
          {selectedStyle ? (
            <p className="rounded-lg bg-white/80 px-3 py-2 text-xs text-slate-500">
              Selected style: <strong className="text-slate-800">{selectedStyle.label}</strong>
            </p>
          ) : null}
        </Card>
      </form>
    </div>
  )
}
