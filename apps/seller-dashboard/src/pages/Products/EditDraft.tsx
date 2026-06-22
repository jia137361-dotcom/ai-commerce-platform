import { FormEvent, useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, ApiError, STOREFRONT_URL } from "../../lib/api-client"
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
  supplier_size_id?: string | null
  supplier_color_id?: string | null
  color?: string | null
  size?: string | null
  color_name?: string | null
  size_name?: string | null
}

type EditLocationState = {
  product?: NormalizedProduct
  generation?: Record<string, unknown>
}

const toVariantRows = (
  rows: unknown,
  fallbackPrice: number
): ProductVariantRow[] => {
  if (!Array.isArray(rows)) return []
  return rows
    .flatMap((row): ProductVariantRow[] => {
      if (!row || typeof row !== "object") return []
      const v = row as Record<string, unknown>
      const supplierVariantId = String(v.supplier_variant_id ?? "")
      if (!supplierVariantId) return []
      return [{
        supplier_variant_id: supplierVariantId,
        medusa_variant_id: typeof v.medusa_variant_id === "string" ? v.medusa_variant_id : undefined,
        supplier_size_id: typeof v.supplier_size_id === "string" ? v.supplier_size_id : undefined,
        supplier_color_id: typeof v.supplier_color_id === "string" ? v.supplier_color_id : undefined,
        color: String(v.color ?? "Default"),
        size: String(v.size ?? "Default"),
        price: Number(v.price ?? fallbackPrice) || fallbackPrice,
        stock: Number(v.stock ?? 50) || 0,
      }]
    })
}

const buildVariantsFromSupplier = (
  supplierVariants: SupplierVariant[],
  fallbackPrice: number
): ProductVariantRow[] =>
  supplierVariants.map((variant) => ({
    supplier_variant_id: variant.supplier_variant_id,
    supplier_size_id: variant.supplier_size_id ?? undefined,
    supplier_color_id: variant.supplier_color_id ?? undefined,
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
  const stateGeneration = (location.state as EditLocationState | null)?.generation

  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    enabled: Boolean(id),
    queryFn: () => apiFetch<{ product: NormalizedProduct }>(storeProductPath(id!)),
    retry: false,
    refetchOnMount: "always",
  })

  const product = data?.product ?? stateProduct

  const { data: categoryData } = useQuery({
    queryKey: ["product-categories"],
    queryFn: () => apiFetch<{ categories: Array<{ category_id: string; name: string }> }>("/admin/product-categories"),
  })

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
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [variants, setVariants] = useState<ProductVariantRow[]>([])
  const [requiresShipping, setRequiresShipping] = useState(true)
  const [previewKey, setPreviewKey] = useState<string>("mockup_front")

  useEffect(() => {
    const p = data?.product ?? stateProduct
    if (!p) return

    setTitle(p.title ?? "")
    setDescription(p.description ?? "")
    setPrice(String(p.price ?? ""))
    setTags(Array.isArray(p.tags) ? p.tags : [])
    setCategoryIds(Array.isArray(p.category_ids) ? p.category_ids : [])
    setRequiresShipping(
      typeof p.requires_shipping === "boolean"
        ? p.requires_shipping
        : typeof p.metadata?.requires_shipping === "boolean"
          ? p.metadata.requires_shipping
          : Boolean(p.supplier_product_id || p.platform_product_id)
    )

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

  const { mockups, diyAssets } = buildProductGallery(product, stateGeneration, {
    cacheKey: product?.ai_job_id ?? null,
  })
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
    category_ids: categoryIds,
    variants,
    requires_shipping: requiresShipping,
    metadata: {
      ...(product?.metadata ?? {}),
      requires_shipping: requiresShipping,
    },
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

  const restoreMutation = useMutation({
    mutationFn: () =>
      apiFetch(storeProductPath(id!), {
        method: "PUT",
        body: JSON.stringify({ status: "draft" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      toast.push("Restored to draft — you can edit again", "success")
    },
    onError: (err: unknown) => {
      toast.push(formatError(err), "error")
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ product_id: string }>(`/admin/products/${id}/duplicate`, { method: "POST" }),
    onSuccess: (res) => navigate(`/products/${res.product_id}/edit`),
    onError: (err: unknown) => {
      toast.push(formatError(err), "error")
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: () => apiFetch<{ category_id: string }>("/admin/product-categories", {
      method: "POST",
      body: JSON.stringify({ name: newCategoryName.trim() }),
    }),
    onSuccess: (created) => {
      setCategoryIds([created.category_id])
      setNewCategoryName("")
      queryClient.invalidateQueries({ queryKey: ["product-categories"] })
      toast.push("Category created for this store", "success")
    },
    onError: (err: unknown) => toast.push(formatError(err), "error"),
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

  const openPreview = () => {
    if (product.status !== "published") {
      toast.push("Publish the product first to preview it on the buyer storefront.", "info")
      return
    }
    window.open(`${STOREFRONT_URL}/products/${product.product_id}`, "_blank", "noopener,noreferrer")
  }

  const isArchived = product.status === "archived"
  const isBusy =
    saveMutation.isPending ||
    publishMutation.isPending ||
    restoreMutation.isPending ||
    duplicateMutation.isPending

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/products" className="text-slate-500 hover:text-brand">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">{isArchived ? "Archived product" : "Edit Draft"}</h1>
          <Badge label={product.status} />
        </div>
        <div className="flex gap-2">
          {!isArchived ? (
            <>
              <Button variant="outline" type="button" onClick={openPreview}>
                Preview
              </Button>
              {product.status === "draft" ? (
                <Button
                  disabled={isBusy}
                  onClick={() => {
                    if (validateBeforeSave()) publishMutation.mutate()
                  }}
                >
                  {publishMutation.isPending ? "Publishing…" : "Publish"}
                </Button>
              ) : product.is_cart_addable === false ? (
                <Button
                  disabled={isBusy}
                  onClick={() => {
                    if (validateBeforeSave()) publishMutation.mutate()
                  }}
                >
                  {publishMutation.isPending ? "Enabling…" : "Enable cart"}
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={isBusy}
                onClick={() => duplicateMutation.mutate()}
              >
                {duplicateMutation.isPending ? "Duplicating…" : "Duplicate"}
              </Button>
              <Button disabled={isBusy} onClick={() => restoreMutation.mutate()}>
                {restoreMutation.isPending ? "Restoring…" : "Restore to draft"}
              </Button>
            </>
          )}
        </div>
      </div>

      {isArchived ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This product is archived and cannot be edited. Restore it to draft or duplicate to create
          a new editable copy.
        </div>
      ) : null}

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
              disabled={isArchived}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              className="mt-1"
              rows={5}
              value={description}
              disabled={isArchived}
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
                disabled={isArchived}
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
                  {!isArchived ? (
                    <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
              {!isArchived ? (
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
              ) : null}
            </div>
          </div>

          <div>
            <Label>Category</Label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={categoryIds[0] ?? ""}
              disabled={isArchived}
              onChange={(event) => setCategoryIds(event.target.value ? [event.target.value] : [])}
            >
              <option value="">No category</option>
              {(categoryData?.categories ?? []).map((category) => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">Only real categories created for this store are shown.</p>
            {!isArchived ? (
              <div className="mt-3 flex gap-2">
                <Input
                  value={newCategoryName}
                  placeholder="New category name"
                  onChange={(event) => setNewCategoryName(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                  onClick={() => createCategoryMutation.mutate()}
                >
                  Add category
                </Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Fulfillment</p>
            <p className="mt-1 text-sm text-slate-500">
              Controls whether buyers must enter a delivery address and shipping method at checkout.
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={requiresShipping}
                disabled={isArchived}
                onChange={(e) => setRequiresShipping(e.target.checked)}
              />
              <span>
                <span className="font-medium text-slate-900">Requires physical delivery</span>
                <span className="mt-1 block text-slate-500">
                  Turn off only for digital goods that never ship.
                </span>
              </span>
            </label>
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
                          disabled={isArchived}
                          onChange={(e) => updateVariant(index, "color", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={variant.size}
                          disabled={isArchived}
                          onChange={(e) => updateVariant(index, "size", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={variant.stock}
                          disabled={isArchived}
                          onChange={(e) => updateVariant(index, "stock", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={variant.price}
                          disabled={isArchived}
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

          {!isArchived ? (
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
            ) : product.is_cart_addable === false ? (
              <Button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  if (validateBeforeSave()) publishMutation.mutate()
                }}
              >
                {publishMutation.isPending ? "Enabling…" : "Enable cart checkout"}
              </Button>
            ) : null}
            <Button type="button" variant="danger" onClick={() => setConfirmArchive(true)}>
              Archive
            </Button>
          </div>
          ) : null}
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
