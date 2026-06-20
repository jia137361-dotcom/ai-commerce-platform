import { FormEvent, useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, ApiError } from "../../lib/api-client"
import { storeProductPath } from "../../lib/store-product-api"
import { buildProductGallery } from "../../lib/product-gallery"
import { useToast } from "../../components/ToastProvider"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { Input, Label, Textarea } from "../../components/ui/Input"
import { Modal } from "../../components/ui/Modal"
import { Skeleton } from "../../components/ui/EmptyState"
import type { NormalizedProduct, ProductVariantRow } from "@ai-commerce/shared-types"

type SupplierVariant = {
  supplier_variant_id: string
  color?: string | null
  size?: string | null
  color_name?: string | null
  size_name?: string | null
}

type EditLocationState = {
  product?: NormalizedProduct
}

const toVariantRows = (
  rows: unknown,
  fallbackPrice: number
): ProductVariantRow[] => {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const v = row as Record<string, unknown>
      const supplierVariantId = String(v.supplier_variant_id ?? "")
      if (!supplierVariantId) return null
      return {
        supplier_variant_id: supplierVariantId,
        color: String(v.color ?? "Default"),
        size: String(v.size ?? "Default"),
        price: Number(v.price ?? fallbackPrice) || fallbackPrice,
        stock: Number(v.stock ?? 50) || 0,
      }
    })
    .filter((row): row is ProductVariantRow => row !== null)
}

const buildVariantsFromSupplier = (
  supplierVariants: SupplierVariant[],
  fallbackPrice: number
): ProductVariantRow[] =>
  supplierVariants.map((variant) => ({
    supplier_variant_id: variant.supplier_variant_id,
    color: variant.color_name ?? variant.color ?? "Default",
    size: variant.size_name ?? variant.size ?? "Default",
    price: fallbackPrice,
    stock: 50,
  }))

export function EditDraftPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [variantsInitialized, setVariantsInitialized] = useState(false)

  const stateProduct = (location.state as EditLocationState | null)?.product

  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    enabled: Boolean(id),
    queryFn: () => apiFetch<{ product: NormalizedProduct }>(storeProductPath(id!)),
    retry: false,
    refetchOnMount: "always",
  })

  const product = data?.product ?? stateProduct

  const { data: supplierData } = useQuery({
    queryKey: ["supplier-products", product?.platform_product_id],
    enabled: Boolean(product?.platform_product_id),
    queryFn: () =>
      apiFetch<{
        supplier_products: Array<{
          supplier_product_id: string
          name: string
          variants: SupplierVariant[]
        }>
      }>(`/admin/supplier-products?platform_product_id=${product?.platform_product_id}`),
  })

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [variants, setVariants] = useState<ProductVariantRow[]>([])
  const [previewKey, setPreviewKey] = useState<string>("mockup_front")

  useEffect(() => {
    const p = data?.product ?? stateProduct
    if (!p) return

    setTitle(p.title ?? "")
    setDescription(p.description ?? "")
    setPrice(String(p.price ?? ""))
    setTags(Array.isArray(p.tags) ? p.tags : [])

    const savedVariants = toVariantRows(p.variants, Number(p.price ?? 0) || 0)
    if (savedVariants.length) {
      setVariants(savedVariants)
      setVariantsInitialized(true)
    }
  }, [data, stateProduct])

  useEffect(() => {
    if (variantsInitialized || variants.length || !product || !supplierData) return

    const supplierProduct =
      supplierData.supplier_products.find(
        (row) => row.supplier_product_id === product.supplier_product_id
      ) ?? supplierData.supplier_products[0]

    if (!supplierProduct?.variants?.length) return

    const fallbackPrice = Number(price) || Number(product.price) || 0
    setVariants(buildVariantsFromSupplier(supplierProduct.variants, fallbackPrice))
    setVariantsInitialized(true)
  }, [supplierData, product, variants.length, variantsInitialized, price])

  const { mockups, diyAssets } = buildProductGallery(product)
  const previewOptions = mockups

  const activePreviewUrl =
    previewOptions.find((option) => option.id === previewKey)?.url ??
    previewOptions[0]?.url

  useEffect(() => {
    if (!previewOptions.length) return
    if (!previewOptions.some((option) => option.id === previewKey)) {
      setPreviewKey(previewOptions[0].id)
    }
  }, [product?.product_id, product?.metadata?.gallery, previewKey, previewOptions.length])

  const parsePrice = () => {
    const parsed = Number(price)
    return Number.isFinite(parsed) ? parsed : NaN
  }

  const buildPayload = () => ({
    title: title.trim(),
    description,
    price: parsePrice(),
    tags,
    variants,
  })

  const formatError = (err: unknown) => {
    if (err instanceof ApiError) return err.message
    return err instanceof Error ? err.message : "Request failed"
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch(storeProductPath(id!), {
        method: "PUT",
        body: JSON.stringify(buildPayload()),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      toast.push("Draft saved", "success")
    },
    onError: (err: unknown) => {
      toast.push(formatError(err), "error")
    },
  })

  const validateBeforeSave = () => {
    if (!title.trim()) {
      toast.push("Product title is required", "error")
      return false
    }
    const parsedPrice = parsePrice()
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast.push("Enter a valid base price", "error")
      return false
    }
    return true
  }

  const publishMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(storeProductPath(id!), {
        method: "PUT",
        body: JSON.stringify(buildPayload()),
      })
      return apiFetch(`/admin/products/${id}/publish`, { method: "POST" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      toast.push("Published to storefront", "success")
      navigate("/products")
    },
    onError: (err: unknown) => {
      toast.push(formatError(err), "error")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(storeProductPath(id!), { method: "DELETE" }),
    onSuccess: () => navigate("/products"),
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Archive failed", "error")
    },
  })

  const updateVariant = (
    index: number,
    field: keyof ProductVariantRow,
    value: string
  ) => {
    setVariants((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        if (field === "price" || field === "stock") {
          return { ...row, [field]: Number(value) || 0 }
        }
        return { ...row, [field]: value }
      })
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validateBeforeSave()) return
    saveMutation.mutate()
  }

  if (isLoading && !stateProduct) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-square" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!product) {
    return <p className="text-slate-600">Product not found</p>
  }

  const isBusy = saveMutation.isPending || publishMutation.isPending

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/products" className="text-slate-500 hover:text-brand">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">Edit Draft</h1>
          <Badge label={product.status} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Preview</Button>
          {product.status === "draft" ? (
            <Button
              disabled={isBusy}
              onClick={() => {
                if (validateBeforeSave()) publishMutation.mutate()
              }}
            >
              {publishMutation.isPending ? "Publishing…" : "Publish"}
            </Button>
          ) : null}
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            {activePreviewUrl ? (
              <img
                src={activePreviewUrl}
                alt={title}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-slate-100 text-slate-400">
                No preview
              </div>
            )}
            {product.source === "ai" ? (
              <div className="border-t bg-brand-light px-4 py-2 text-xs font-semibold uppercase text-brand">
                AI Generated Draft
              </div>
            ) : null}
          </Card>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              T-shirt Mockup Preview
            </p>
            {previewOptions.length ? (
              <div className="flex flex-wrap gap-3">
                {previewOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={`Show ${option.label}`}
                    aria-pressed={previewKey === option.id}
                    onClick={() => setPreviewKey(option.id)}
                    className="text-center"
                  >
                    <div
                      className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition ${
                        previewKey === option.id
                          ? "border-brand ring-2 ring-brand/30"
                          : "border-slate-200 hover:border-brand/50"
                      }`}
                    >
                      <img
                        src={option.url}
                        alt={option.label}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{option.label}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No mockup views available.</p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              {previewOptions.length} view{previewOptions.length === 1 ? "" : "s"} · Front / Back /
              On-body when generated
            </p>
          </div>

          {diyAssets.length ? (
            <Card>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Production Files
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Print Artwork is the flat graphic. Print File is the supplier-ready production asset.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {diyAssets.map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-lg border border-slate-200"
                  >
                    <img
                      src={asset.url}
                      alt={asset.label}
                      className="aspect-square w-full object-cover transition group-hover:opacity-90"
                    />
                    <p className="border-t px-3 py-2 text-sm font-medium text-slate-700">
                      {asset.label}
                    </p>
                  </a>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <Card className="space-y-5">
          <div>
            <Label>Product Title</Label>
            <Input
              className="mt-1 text-lg font-semibold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              className="mt-1"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Base Price</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <Label>Default Stock</Label>
              <Input className="mt-1" value="50 units per variant" readOnly />
            </div>
          </div>
          <div>
            <Label>Search Tags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm"
                >
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                className="rounded-full border border-dashed border-brand px-3 py-1 text-sm text-brand"
                onClick={() => {
                  const next = window.prompt("Add tag")
                  if (next?.trim()) setTags([...tags, next.trim()])
                }}
              >
                + Add tag
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200">
            <div className="border-b px-4 py-2 text-xs font-semibold uppercase text-slate-500">
              Product Variants
            </div>
            {variants.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="px-4 py-2">Color</th>
                    <th className="px-4 py-2">Size</th>
                    <th className="px-4 py-2">Stock</th>
                    <th className="px-4 py-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant, index) => (
                    <tr key={variant.supplier_variant_id} className="border-t">
                      <td className="px-4 py-2">
                        <Input
                          value={variant.color}
                          onChange={(e) => updateVariant(index, "color", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={variant.size}
                          onChange={(e) => updateVariant(index, "size", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={variant.stock}
                          onChange={(e) => updateVariant(index, "stock", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={variant.price}
                          onChange={(e) => updateVariant(index, "price", e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-sm text-slate-500">Loading variants…</p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="submit" variant="outline" disabled={isBusy}>
              Save as Draft
            </Button>
            {product.status === "draft" ? (
              <Button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  if (validateBeforeSave()) publishMutation.mutate()
                }}
              >
                {publishMutation.isPending ? "Publishing…" : "Publish to Storefront"}
              </Button>
            ) : null}
            <Button type="button" variant="danger" onClick={() => setConfirmArchive(true)}>
              Archive
            </Button>
          </div>
        </Card>
      </form>

      <Modal
        open={confirmArchive}
        title="Archive this draft?"
        onClose={() => setConfirmArchive(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmArchive(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteMutation.mutate()}>
              Archive
            </Button>
          </>
        }
      >
        The product will be archived and hidden from your catalog.
      </Modal>
    </div>
  )
}
