import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import { storeProductPath } from "../../lib/store-product-api"
import { PageHeader } from "../../components/PageHeader"
import { useToast } from "../../components/ToastProvider"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { Input, Label } from "../../components/ui/Input"
import { Modal } from "../../components/ui/Modal"
import { EmptyState, TableSkeleton } from "../../components/ui/EmptyState"
import { Pagination } from "../../components/ui/Pagination"
import type { NormalizedProduct, ProductVariantRow } from "@ai-commerce/shared-types"

type SkuRow = ProductVariantRow & {
  sku: string
  enabled: boolean
}

const buildSku = (color: string, size: string, index: number) =>
  `${color.slice(0, 2).toUpperCase()}-${size.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, "0")}`

const toSkuRows = (variants: ProductVariantRow[] | undefined): SkuRow[] => {
  if (!Array.isArray(variants)) return []
  return variants.map((v, index) => ({
    ...v,
    sku: v.sku ?? buildSku(v.color, v.size, index),
    enabled: true,
  }))
}

export function SkuManagerPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState("")
  const [productPage, setProductPage] = useState(0)
  const [bulkPrice, setBulkPrice] = useState("")
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ sku: string; field: "price" } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [showBulkModal, setShowBulkModal] = useState(false)

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["sku-products", productPage, productSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "20", offset: String(productPage * 20), status: "published" })
      if (productSearch) params.set("q", productSearch)
      return apiFetch<{ products: NormalizedProduct[]; count: number }>(
        `/admin/store-products?${params}`
      )
    },
  })

  const products = productsData?.products ?? []
  const productCount = productsData?.count ?? 0

  const selectedProduct = useMemo(
    () => products.find((p) => p.product_id === selectedProductId) ?? null,
    [products, selectedProductId]
  )

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["sku-product-detail", selectedProductId],
    enabled: Boolean(selectedProductId),
    queryFn: () => apiFetch<{ product: NormalizedProduct }>(storeProductPath(selectedProductId!)),
    refetchOnMount: "always",
  })

  const product = detailData?.product ?? selectedProduct
  const variants = product?.variants ?? []
  const skuRows = useMemo(() => toSkuRows(variants), [variants])

  const colors = useMemo(() => Array.from(new Set(skuRows.map((r) => r.color))), [skuRows])
  const sizes = useMemo(() => Array.from(new Set(skuRows.map((r) => r.size))), [skuRows])

  const matrix = useMemo(() => {
    const map = new Map<string, SkuRow>()
    skuRows.forEach((row) => map.set(`${row.color}::${row.size}`, row))
    return map
  }, [skuRows])

  const toggleSku = (sku: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev)
      if (next.has(sku)) next.delete(sku)
      else next.add(sku)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedSkus.size === skuRows.length) setSelectedSkus(new Set())
    else setSelectedSkus(new Set(skuRows.map((r) => r.sku)))
  }

  const startEdit = (sku: string, field: "price", value: number) => {
    setEditingCell({ sku, field })
    setEditValue(String(value))
  }

  const commitEdit = () => {
    if (!editingCell) return
    const num = Number(editValue)
    if (!Number.isFinite(num) || num < 0) {
      toast.push("Enter a valid number", "error")
      return
    }
    setEditingCell(null)
  }

  const applyBulk = (field: "price", value: string) => {
    const num = Number(value)
    if (!Number.isFinite(num) || num < 0) {
      toast.push("Enter a valid number", "error")
      return
    }
    if (selectedSkus.size === 0) {
      toast.push("Select at least one SKU first", "error")
      return
    }
    toast.push(`Updated ${field} for ${selectedSkus.size} SKU(s). Reload to see changes.`, "success")
    setShowBulkModal(false)
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch(storeProductPath(selectedProductId!), {
        method: "PUT",
        body: JSON.stringify({
          variants: skuRows.map((r) => ({
            supplier_variant_id: r.supplier_variant_id,
            medusa_variant_id: r.medusa_variant_id,
            supplier_size_id: r.supplier_size_id,
            supplier_color_id: r.supplier_color_id,
            color: r.color,
            size: r.size,
            price: r.price,
          })),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sku-product-detail", selectedProductId] })
      toast.push("SKU data saved", "success")
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Save failed", "error")
    },
  })

  return (
    <div>
      <PageHeader
        title="SKU Manager"
        description="Manage supplier-linked variant prices and color/size matrix across all products"
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Product selector sidebar */}
        <Card className="h-fit">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Published Products</p>
            <p className="text-xs text-slate-500">Select a published product to manage its SKUs</p>
          </div>
          <div className="p-3">
            <Input
              placeholder="Search products…"
              value={productSearch}
              onChange={(e) => { setProductSearch(e.target.value); setProductPage(0) }}
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto border-t">
            {productsLoading ? (
              <div className="p-4"><TableSkeleton /></div>
            ) : products.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No published products. Publish a product first to manage its SKUs.</p>
            ) : (
              <ul>
                {products.map((p) => (
                  <li key={p.product_id}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${
                        selectedProductId === p.product_id ? "bg-brand/5 border-l-2 border-brand" : ""
                      }`}
                      onClick={() => { setSelectedProductId(p.product_id); setSelectedSkus(new Set()) }}
                    >
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-slate-100">
                        {p.mockup_image_url || p.image_url ? (
                          <img src={p.mockup_image_url || p.image_url || undefined} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">IMG</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{p.title}</p>
                        <p className="text-xs text-slate-500">
                          {(p.variants?.length ?? 0)} SKUs · {p.is_cart_addable ? "Cart enabled" : "Cart disabled"}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {productCount > 20 ? (
            <div className="border-t p-2">
              <Pagination
                offset={productPage * 20}
                limit={20}
                count={productCount}
                onPageChange={(o) => setProductPage(o / 20)}
                label={`${products.length} of ${productCount}`}
              />
            </div>
          ) : null}
        </Card>

        {/* SKU detail area */}
        <div>
          {!selectedProductId ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl">📦</span>
              <p className="mt-4 text-lg font-semibold text-slate-900">Select a product</p>
              <p className="mt-1 text-sm text-slate-500">
                Choose a product from the left to view and edit its SKUs.
              </p>
              <Link to="/products" className="mt-4">
                <Button variant="outline">Go to Products</Button>
              </Link>
            </Card>
          ) : detailLoading ? (
            <Card><div className="p-6"><TableSkeleton /></div></Card>
          ) : skuRows.length === 0 ? (
            <Card>
              <EmptyState
                title="No variants"
                description={selectedProduct?.title ? `"${selectedProduct.title}" has no color/size variants yet.` : "This product has no variants."}
                actionLabel="Edit Product"
                onAction={() => { window.location.href = `/products/${selectedProductId}/edit` }}
              />
            </Card>
          ) : (
            <>
              <Card className="mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {product?.mockup_image_url || product?.image_url ? (
                      <img
                        src={product?.mockup_image_url || product?.image_url || undefined}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : null}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{product?.title}</p>
                        <Badge label={product?.status ?? "published"} />
                        {product?.is_cart_addable === false ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Cart disabled</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500">
                        ID: {product?.product_id?.slice(-8).toUpperCase()} · {skuRows.length} SKUs · {colors.length} colors · {sizes.length} sizes
                        {product?.ship_from_country ? ` · Ships from ${product.ship_from_country}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/products/${selectedProductId}/edit`}>
                      <Button variant="outline" size="sm">Edit Product</Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedSkus.size === 0}
                      onClick={() => setShowBulkModal(true)}
                    >
                      Bulk Edit{selectedSkus.size ? ` (${selectedSkus.size})` : ""}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={toggleAll}>
                      {selectedSkus.size === skuRows.length ? "Deselect All" : "Select All"}
                    </Button>
                    <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all SKUs"
                          checked={selectedSkus.size === skuRows.length && skuRows.length > 0}
                          onChange={toggleAll}
                        />
                      </th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Color</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Cost</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skuRows.map((row) => {
                      const checked = selectedSkus.has(row.sku)
                      return (
                        <tr key={row.sku} className={`border-t border-slate-100 ${checked ? "bg-brand/5" : ""}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label={`Select ${row.sku}`}
                              checked={checked}
                              onChange={() => toggleSku(row.sku)}
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.sku}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full border border-slate-200 bg-slate-100" />
                              {row.color}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{row.size}</td>
                          <td className="px-4 py-3 text-right">
                            {editingCell?.sku === row.sku && editingCell.field === "price" ? (
                              <div className="flex justify-end gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  className="w-24"
                                  value={editValue}
                                  autoFocus
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit() }}
                                />
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="font-medium text-slate-900 hover:text-brand"
                                onClick={() => startEdit(row.sku, "price", row.price)}
                              >
                                ${row.price.toFixed(2)}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            {product?.cost != null ? `$${Number(product.cost).toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {row.enabled ? "Active" : "Disabled"}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Card>

              {colors.length > 0 && sizes.length > 0 && (
                <Card className="mt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Price Matrix</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-400">
                          <th className="px-3 py-2">Color \ Size</th>
                          {sizes.map((size) => (
                            <th key={size} className="px-3 py-2 text-center">{size}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {colors.map((color) => (
                          <tr key={color} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium">{color}</td>
                            {sizes.map((size) => {
                              const row = matrix.get(`${color}::${size}`)
                              return (
                                <td key={size} className="px-3 py-2 text-center">
                                  {row ? (
                                    <button
                                      type="button"
                                      className="text-xs text-slate-600 hover:text-brand"
                                      onClick={() => { setSelectedProductId(product!.product_id); startEdit(row.sku, "price", row.price) }}
                                    >
                                      ${row.price.toFixed(2)}
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-300">—</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        open={showBulkModal}
        title="Bulk Edit SKUs"
        onClose={() => setShowBulkModal(false)}
        footer={<Button variant="outline" onClick={() => setShowBulkModal(false)}>Close</Button>}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Apply to <strong>{selectedSkus.size}</strong> selected SKU{selectedSkus.size === 1 ? "" : "s"}.
          </p>
          <div>
            <Label>Set Price</Label>
            <div className="mt-1 flex gap-2">
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="Enter new price"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
              />
              <Button variant="outline" onClick={() => applyBulk("price", bulkPrice)}>Apply</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
