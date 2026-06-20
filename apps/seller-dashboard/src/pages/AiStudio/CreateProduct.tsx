import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { Label, Textarea } from "../../components/ui/Input"

type SupplierVariant = {
  supplier_variant_id: string
  color?: string | null
  size?: string | null
  color_name?: string | null
  size_name?: string | null
}

type SupplierProduct = {
  supplier_product_id: string
  supplier_id?: string | null
  name: string
  platform_product_id?: string | null
  basic_product_id?: string | null
  base_cost?: number | null
  variants: SupplierVariant[]
}

type PlatformProduct = {
  platform_product_id: string
  title: string
}

const MARKETPLACE_CATEGORIES = [
  { id: "clothing_shoes_jewelry", label: "Clothing, Shoes & Jewelry" },
  { id: "home_kitchen", label: "Home & Kitchen" },
  { id: "sports_outdoors", label: "Sports & Outdoors" },
  { id: "toys_games", label: "Toys & Games" },
  { id: "pet_supplies", label: "Pet Supplies" },
  { id: "office_products", label: "Office Products" },
  { id: "arts_crafts_sewing", label: "Arts, Crafts & Sewing" },
  { id: "beauty_personal_care", label: "Beauty & Personal Care" },
] as const

const GARMENT_HINT =
  /\b(t-?shirts?|tee|hoodie|mug|wearing|inside a|mockup|mannequin|printed on)\b/i

const variantLabel = (variant: SupplierVariant) => {
  const color = variant.color_name ?? variant.color ?? "Default"
  const size = variant.size_name ?? variant.size ?? "One size"
  return `${color} / ${size}`
}

export function CreateProductPage() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState("")
  const [marketplaceCategory, setMarketplaceCategory] = useState<string>(
    MARKETPLACE_CATEGORIES[0].id
  )
  const [supplierProductId, setSupplierProductId] = useState("")
  const [supplierVariantId, setSupplierVariantId] = useState("")
  const [loading, setLoading] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: platformData } = useQuery({
    queryKey: ["platform-products"],
    queryFn: () =>
      apiFetch<{ platform_products: PlatformProduct[] }>("/admin/platform-products"),
  })

  const { data: supplierData, isLoading: suppliersLoading } = useQuery({
    queryKey: ["supplier-products-all"],
    queryFn: () =>
      apiFetch<{ supplier_products: SupplierProduct[] }>("/admin/supplier-products"),
    staleTime: 0,
    refetchOnMount: "always",
  })

  const platformTitles = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of platformData?.platform_products ?? []) {
      map.set(row.platform_product_id, row.title)
    }
    return map
  }, [platformData])

  const supplierProducts = useMemo(() => {
    const rows = supplierData?.supplier_products ?? []
    return [...rows].sort((a, b) => {
      const aMock = a.supplier_id === "sup_citigoo_mock" ? 0 : 1
      const bMock = b.supplier_id === "sup_citigoo_mock" ? 0 : 1
      if (aMock !== bMock) return aMock - bMock
      return a.name.localeCompare(b.name)
    })
  }, [supplierData])

  const supplierBadge = (row: SupplierProduct) => {
    if (row.basic_product_id) return "S2B"
    if (row.supplier_id === "sup_citigoo_mock") return "Mock"
    return "Supplier"
  }

  const fulfillmentLabel = (row: SupplierProduct) => {
    const platformTitle = row.platform_product_id
      ? platformTitles.get(row.platform_product_id)
      : null
    const badge = supplierBadge(row)
    const base = platformTitle && platformTitle !== row.name ? `${row.name} (${platformTitle})` : row.name
    return `[${badge}] ${base}`
  }

  const selectedSupplier = supplierProducts.find(
    (row) => row.supplier_product_id === supplierProductId
  )

  useEffect(() => {
    if (!supplierProducts.length) return
    if (!supplierProductId) {
      setSupplierProductId(supplierProducts[0].supplier_product_id)
    }
  }, [supplierProducts, supplierProductId])

  useEffect(() => {
    if (!selectedSupplier?.variants?.length) return
    const exists = selectedSupplier.variants.some(
      (v) => v.supplier_variant_id === supplierVariantId
    )
    if (!exists) {
      setSupplierVariantId(selectedSupplier.variants[0].supplier_variant_id)
    }
  }, [selectedSupplier, supplierVariantId])

  const promptMentionsGarment = GARMENT_HINT.test(prompt)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      setError("Please enter a design prompt")
      return
    }
    if (!supplierProductId || !supplierVariantId || !selectedSupplier) {
      setError("Select a fulfillment base and variant.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const categoryLabel =
        MARKETPLACE_CATEGORIES.find((c) => c.id === marketplaceCategory)?.label ??
        marketplaceCategory

      const res = await apiFetch<{ job_id: string }>("/admin/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          prompt: prompt.trim(),
          platform_product_id: selectedSupplier.platform_product_id ?? "pp_tshirt",
          supplier_product_id: supplierProductId,
          supplier_variant_id: supplierVariantId,
          print_position: "front",
          marketplace_category: marketplaceCategory,
          marketplace_category_label: categoryLabel,
        }),
      })
      navigate(`/ai-studio/progress/${res.job_id}`, {
        state: {
          prompt: prompt.trim(),
          productName: selectedSupplier.name,
          marketplaceCategory: categoryLabel,
        },
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start generation")
    } finally {
      setLoading(false)
    }
  }

  const createManualDraft = async () => {
    if (!supplierProductId || !supplierVariantId || !selectedSupplier) {
      setError("Select a fulfillment base and variant.")
      return
    }

    setManualLoading(true)
    setError(null)
    try {
      const categoryLabel =
        MARKETPLACE_CATEGORIES.find((c) => c.id === marketplaceCategory)?.label ??
        marketplaceCategory

      const res = await apiFetch<{ product_id: string }>("/admin/products/draft", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled Product",
          description: "",
          price: 19.99,
          cost: selectedSupplier.base_cost ?? 8.5,
          source: "manual",
          platform_product_id: selectedSupplier.platform_product_id ?? "pp_tshirt",
          supplier_product_id: supplierProductId,
          supplier_variant_id: supplierVariantId,
          metadata: {
            marketplace_category: marketplaceCategory,
            marketplace_category_label: categoryLabel,
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
          ← Back
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Create Product with AI</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Describe the print artwork only. We generate the flat design with AI, then composite it
            onto your selected T-shirt / fulfillment base for mockup previews.
          </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <Label>Fulfillment base</Label>
            <p className="mt-1 text-sm text-slate-500">
              Physical blank product for printing and order fulfillment (T-shirt, mug, etc.).
            </p>
            {suppliersLoading ? (
              <p className="mt-3 text-sm text-slate-400">Loading catalog…</p>
            ) : supplierProducts.length ? (
              <>
                <select
                  className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={supplierProductId}
                  onChange={(e) => setSupplierProductId(e.target.value)}
                >
                  {supplierProducts.map((row) => (
                    <option key={row.supplier_product_id} value={row.supplier_product_id}>
                      {fulfillmentLabel(row)}
                    </option>
                  ))}
                </select>
                {selectedSupplier?.variants?.length ? (
                  <div className="mt-3">
                    <Label className="text-xs text-slate-500">Default variant</Label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={supplierVariantId}
                      onChange={(e) => setSupplierVariantId(e.target.value)}
                    >
                      {selectedSupplier.variants.map((variant) => (
                        <option
                          key={variant.supplier_variant_id}
                          value={variant.supplier_variant_id}
                        >
                          {variantLabel(variant)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm text-amber-700">
                No supplier products in catalog. Run backend seed first.
              </p>
            )}
            {supplierProducts.length === 1 ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Only one fulfillment base is available right now. Run{" "}
                <code className="rounded bg-white px-1">npm run seed</code> in medusa-backend to add
                Mock T-shirt/Hoodie/Mug options, or sync more S2B basic products via{" "}
                <code className="rounded bg-white px-1">POST /admin/supplier-products/sync-basic-product</code>.
              </p>
            ) : null}
          </Card>

          <Card>
            <Label>What do you want to create?</Label>
            <p className="mt-1 text-sm text-slate-500">
              Describe the <strong>artwork only</strong> — subject, style, colors, mood. Do not
              mention T-shirt, mug, or mockup here; pick the fulfillment base above instead.
            </p>
            <Textarea
              className="mt-3"
              rows={6}
              maxLength={500}
              placeholder="Example: Cute fluffy panda eating a bamboo-shaped cake, kawaii style, bright colors, soft lighting, print-ready, no text."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="mt-1 text-right text-xs text-slate-400">{prompt.length}/500</p>
            {promptMentionsGarment ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Your prompt mentions a garment or mockup. We will strip that for artwork generation
                — use <strong>Fulfillment base</strong> to choose the blank product type.
              </p>
            ) : null}
          </Card>

          <Card>
            <Label>Merchandise category</Label>
            <p className="mt-1 text-sm text-slate-500">
              Top-level category for your store catalog. This classifies your listing — not the
              printable blank type.
            </p>
            <select
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={marketplaceCategory}
              onChange={(e) => setMarketplaceCategory(e.target.value)}
            >
              {MARKETPLACE_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </Card>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || manualLoading || !supplierProducts.length}
          >
            {loading ? "Starting…" : "Generate with AI →"}
          </Button>

          <div
            id="manual-draft"
            className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center scroll-mt-24"
          >
            <p className="text-sm text-slate-600">Want to build everything yourself?</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              disabled={loading || manualLoading || !supplierProducts.length}
              onClick={() => void createManualDraft()}
            >
              {manualLoading ? "Creating…" : "Create blank draft (manual)"}
            </Button>
          </div>
        </div>

        <Card className="flex min-h-[480px] flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-white text-center">
          <div className="text-4xl text-brand">✨</div>
          <h3 className="mt-4 text-xl font-semibold text-brand">AI-assisted creation</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            1) AI creates print artwork → 2) System places it on the fulfillment blank → 3) You get
            Front / Back / On-body T-shirt previews plus production print file.
          </p>
          {selectedSupplier ? (
            <p className="mt-4 text-sm font-medium text-slate-700">
              Fulfillment: {fulfillmentLabel(selectedSupplier)}
            </p>
          ) : null}
          <div className="mt-auto flex w-full items-center justify-between pt-8 text-xs text-slate-400">
            <span>AI generate → Edit → Publish</span>
            <span className="text-brand">Or manual draft</span>
          </div>
        </Card>
      </form>
    </div>
  )
}
