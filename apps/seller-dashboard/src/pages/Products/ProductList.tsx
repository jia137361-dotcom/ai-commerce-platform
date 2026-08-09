import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import {
  storeProductPath,
  storeProductPermanentDeletePath,
  storeProductsBulkPath,
  storeProductsListPath,
} from "../../lib/store-product-api"
import { PageHeader } from "../../components/PageHeader"
import { useToast } from "../../components/ToastProvider"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { DropdownMenu, Modal } from "../../components/ui/Modal"
import { EmptyState, TableSkeleton } from "../../components/ui/EmptyState"
import { Pagination, Tabs } from "../../components/ui/Pagination"
import type { NormalizedProduct } from "@ai-commerce/shared-types"

const STATUSES = [
  { id: "all" as const, label: "All" },
  { id: "published" as const, label: "Published" },
  { id: "draft" as const, label: "Draft" },
  { id: "failed" as const, label: "Failed" },
  { id: "archived" as const, label: "Archived" },
]

type BulkAction = "archive" | "delete"

const isFailedProduct = (product: NormalizedProduct) => {
  const meta = product.metadata ?? {}
  return (
    product.source === "ai" &&
    (meta.generation_failed === true ||
      (typeof meta.s2b_provision_error === "string" && meta.s2b_provision_error.length > 0))
  )
}

const canPermanentlyDelete = (product: NormalizedProduct) =>
  product.status === "draft" ||
  product.status === "unpublished" ||
  product.status === "archived"

export function ProductListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [status, setStatus] = useState<(typeof STATUSES)[number]["id"]>("all")
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({
    category: "",
    product_type: "",
    warehouse_region: "",
    country: "",
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null)
  const limit = 20

  const apiStatus = status
  const queryParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    ...(search ? { q: search } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.product_type ? { product_type: filters.product_type } : {}),
    ...(filters.warehouse_region ? { warehouse_region: filters.warehouse_region } : {}),
    ...(filters.country ? { country: filters.country } : {}),
  })
  if (apiStatus !== "all") {
    queryParams.set("status", apiStatus)
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", apiStatus, offset, search, filters],
    queryFn: () =>
      apiFetch<{ products: NormalizedProduct[]; count: number }>(
        storeProductsListPath(queryParams)
      ),
  })

  // Local database fallback and Medusa may omit optional collection fields on
  // older product rows. Never let an incomplete row crash the product list.
  const products = Array.isArray(data?.products) ? data.products : []
  const count = data?.count ?? 0
  const visibleIds = useMemo(() => products.map((product) => product.product_id), [products])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
  const selectedCount = selectedIds.length

  const clearSelection = () => setSelectedIds([])

  const toggleProduct = (productId: string) => {
    setSelectedIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    )
  }

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id))
      }
      return Array.from(new Set([...current, ...visibleIds]))
    })
  }

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] })
    clearSelection()
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(storeProductPath(id), { method: "DELETE" }),
    onSuccess: () => {
      invalidateProducts()
      toast.push("Product archived", "success")
      setDeleteId(null)
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Archive failed", "error")
    },
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(storeProductPermanentDeletePath(id), { method: "DELETE" }),
    onSuccess: () => {
      invalidateProducts()
      toast.push("Product permanently deleted", "success")
      setPermanentDeleteId(null)
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Delete failed", "error")
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (input: { action: BulkAction; product_ids: string[] }) =>
      apiFetch<{ succeeded: number; failed: number; skipped: number }>(storeProductsBulkPath(), {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (result, variables) => {
      invalidateProducts()
      const label = variables.action === "archive" ? "archived" : "deleted"
      toast.push(
        `${result.succeeded} product${result.succeeded === 1 ? "" : "s"} ${label}${result.failed ? `, ${result.failed} failed` : ""}${result.skipped ? `, ${result.skipped} skipped` : ""}`,
        result.failed ? "error" : "success"
      )
      setBulkAction(null)
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Bulk action failed", "error")
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/products/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.push("Product published", "success")
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Publish failed", "error")
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/products/${id}/unpublish`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); toast.push("Product unpublished", "success") },
    onError: (err: unknown) => toast.push(err instanceof Error ? err.message : "Unpublish failed", "error"),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(storeProductPath(id), {
        method: "PUT",
        body: JSON.stringify({ status: "draft" }),
      }),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.push("Product restored to draft", "success")
      navigate(`/products/${id}/edit`)
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Restore failed", "error")
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ product_id: string }>(`/admin/products/${id}/duplicate`, { method: "POST" }),
    onSuccess: (res) => navigate(`/products/${res.product_id}/edit`),
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Duplicate failed", "error")
    },
  })

  return (
    <div>
      <PageHeader
        title="Products"
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/suppliers">
              <Button>+ Add from supplier catalog</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <Tabs items={STATUSES} value={status} onChange={(id) => { setStatus(id); setOffset(0); clearSelection() }} />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setOffset(0)
            setSearch(q.trim())
            clearSelection()
          }}
        >
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      <div className="mb-4 grid gap-3 rounded-card border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4">
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Category"
          value={filters.category}
          onChange={(event) => {
            setOffset(0)
            setFilters((current) => ({ ...current, category: event.target.value }))
            clearSelection()
          }}
        />
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Product type"
          value={filters.product_type}
          onChange={(event) => {
            setOffset(0)
            setFilters((current) => ({ ...current, product_type: event.target.value }))
            clearSelection()
          }}
        />
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Shipping from"
          value={filters.warehouse_region}
          onChange={(event) => {
            setOffset(0)
            setFilters((current) => ({ ...current, warehouse_region: event.target.value }))
            clearSelection()
          }}
        />
        <input
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Sellable country, e.g. US"
          value={filters.country}
          onChange={(event) => {
            setOffset(0)
            setFilters((current) => ({ ...current, country: event.target.value.toUpperCase() }))
            clearSelection()
          }}
        />
      </div>

      {selectedCount ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-700">
            <strong>{selectedCount}</strong> selected
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBulkAction("archive")}>
              Archive selected
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBulkAction("delete")}>
              Delete selected
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <EmptyState
          title="Could not load products"
          description={error instanceof Error ? error.message : "Backend unavailable — restart medusa-backend."}
        />
      ) : !products.length ? (
        <EmptyState
          title={
            status === "all"
              ? "No products yet"
              : `No ${status} products`
          }
          description={
            status === "all"
              ? "Add products from the supplier catalog, import CSV drafts, then publish selected products."
                : status === "failed"
                ? "Failed products need supplier re-provisioning or a new catalog draft."
                : status === "archived"
                  ? "Archived products are hidden from your storefront. Restore to draft to edit again."
                  : `Switch to All to see every product, or create a new ${status}.`
          }
          actionLabel={status === "all" ? "Browse suppliers" : undefined}
          onAction={status === "all" ? () => navigate("/suppliers") : undefined}
        />
      ) : (
        <div className="overflow-visible rounded-card border border-slate-200 bg-white shadow-card">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all products on this page"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const displayStatus = isFailedProduct(product) ? "Failed" : product.status
                const thumb =
                  product.mockup_image_url ||
                  product.design_image_url ||
                  (product.metadata?.mockup_image_url as string | undefined) ||
                  (product.metadata?.design_image_url as string | undefined) ||
                  product.image_url
                const productId = typeof product.product_id === "string" ? product.product_id : "unknown-product"
                const checked = selectedIds.includes(productId)
                return (
                  <tr key={productId} className={`border-t border-slate-100 ${checked ? "bg-slate-50" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${product.title}`}
                        checked={checked}
                        onChange={() => toggleProduct(productId)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{product.title}</p>
                      <p className="text-xs text-slate-400">ID: {productId.slice(-12).toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={displayStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu
                        trigger={
                          <button type="button" className="rounded-lg px-2 py-1 hover:bg-slate-100">
                            •••
                          </button>
                        }
                        items={[
                          {
                            label: product.status === "archived" ? "View" : "Edit",
                            onClick: () => navigate(`/products/${productId}/edit`),
                          },
                          {
                            label: "Manage SKUs",
                            onClick: () => navigate(`/products/${productId}/skus`),
                          },
                          {
                            label: "Duplicate",
                            onClick: () => duplicateMutation.mutate(productId),
                          },
                          ...(product.status === "archived"
                            ? [
                                {
                                  label: "Restore to draft",
                                  variant: "primary" as const,
                                  onClick: () => restoreMutation.mutate(productId),
                                },
                                {
                                  label: "Delete permanently",
                                  variant: "danger" as const,
                                  onClick: () => setPermanentDeleteId(productId),
                                },
                              ]
                            : [
                                {
                                  label: "Archive",
                                  variant: "danger" as const,
                                  onClick: () => setDeleteId(productId),
                                },
                                ...(canPermanentlyDelete(product)
                                  ? [
                                      {
                                        label: "Delete permanently",
                                        variant: "danger" as const,
                                        onClick: () => setPermanentDeleteId(productId),
                                      },
                                    ]
                                  : []),
                              ]),
                          ...(product.status === "draft" && !isFailedProduct(product)
                            ? [
                                {
                                  label: "Publish",
                                  variant: "primary" as const,
                                  onClick: () => publishMutation.mutate(productId),
                                },
                              ]
                            : []),
                          ...(product.status === "published" &&
                          product.is_cart_addable === false &&
                          !isFailedProduct(product)
                            ? [
                                {
                                  label: "Enable cart",
                                  variant: "primary" as const,
                                  onClick: () => publishMutation.mutate(productId),
                                },
                              ]
                            : []),
                          ...(product.status === "published" ? [{ label: "Unpublish", variant: "danger" as const, onClick: () => unpublishMutation.mutate(productId) }] : []),
                          ...(product.status === "unpublished" ? [{ label: "Re-publish", variant: "primary" as const, onClick: () => publishMutation.mutate(productId) }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {data ? (
        <Pagination
          offset={offset}
          limit={limit}
          count={count}
          onPageChange={(nextOffset) => {
            setOffset(nextOffset)
            clearSelection()
          }}
          label={`Showing ${products.length} of ${count} products`}
        />
      ) : null}

      <Modal
        open={Boolean(deleteId)}
        title="Archive product?"
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Archive
            </Button>
          </>
        }
      >
        This will archive the product and hide it from your storefront. You can restore it later from the Archived tab.
      </Modal>

      <Modal
        open={Boolean(permanentDeleteId)}
        title="Delete product permanently?"
        onClose={() => setPermanentDeleteId(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setPermanentDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => permanentDeleteId && permanentDeleteMutation.mutate(permanentDeleteId)}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        This draft, unpublished, or archived product will be permanently removed and cannot be restored.
      </Modal>

      <Modal
        open={Boolean(bulkAction)}
        title={bulkAction === "delete" ? "Delete selected products?" : "Archive selected products?"}
        onClose={() => setBulkAction(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkAction(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={bulkMutation.isPending}
              onClick={() => {
                if (!bulkAction || !selectedIds.length) return
                bulkMutation.mutate({ action: bulkAction, product_ids: selectedIds })
              }}
            >
              {bulkAction === "delete" ? "Delete permanently" : "Archive"}
            </Button>
          </>
        }
      >
        {bulkAction === "delete"
          ? "Only draft, unpublished, or archived products can be permanently deleted. Published items in the selection will be reported as failed."
          : "Selected products will be archived and hidden from your storefront. You can restore them later from the Archived tab."}
      </Modal>
    </div>
  )
}
