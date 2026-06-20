import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import { storeProductPath, storeProductsListPath } from "../../lib/store-product-api"
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
]

const isFailedProduct = (product: NormalizedProduct) => {
  const meta = product.metadata ?? {}
  return (
    product.source === "ai" &&
    (meta.generation_failed === true ||
      (typeof meta.s2b_provision_error === "string" && meta.s2b_provision_error.length > 0))
  )
}

export function ProductListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [status, setStatus] = useState<(typeof STATUSES)[number]["id"]>("all")
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState("")
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const limit = 20

  const apiStatus = status
  const queryParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    ...(search ? { q: search } : {}),
  })
  if (apiStatus !== "all") {
    queryParams.set("status", apiStatus)
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products", apiStatus, offset, search],
    queryFn: () =>
      apiFetch<{ products: NormalizedProduct[]; count: number }>(
        storeProductsListPath(queryParams)
      ),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(storeProductPath(id), { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.push("Product archived", "success")
      setDeleteId(null)
    },
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/products/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.push("Product published", "success")
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ product_id: string }>(`/admin/products/${id}/duplicate`, { method: "POST" }),
    onSuccess: (res) => navigate(`/products/${res.product_id}/edit`),
  })

  const products = data?.products ?? []
  const count = data?.count ?? 0

  return (
    <div>
      <PageHeader
        title="Products"
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/ai-studio/create#manual-draft">
              <Button variant="outline">Create blank draft</Button>
            </Link>
            <Link to="/ai-studio/create">
              <Button>+ New with AI</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <Tabs items={STATUSES} value={status} onChange={(id) => { setStatus(id); setOffset(0) }} />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setOffset(0)
            setSearch(q.trim())
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
              ? "Create your first AI-powered product draft."
              : status === "failed"
                ? "Failed products are AI drafts with generation or S2B provisioning errors."
                : `Switch to All to see every product, or create a new ${status}.`
          }
          actionLabel={status === "all" ? "New with AI" : undefined}
          onAction={status === "all" ? () => navigate("/ai-studio/create") : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
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
                const productId = product.product_id
                return (
                  <tr key={productId} className="border-t border-slate-100">
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
                            label: "Edit",
                            onClick: () => navigate(`/products/${productId}/edit`),
                          },
                          {
                            label: "Duplicate",
                            onClick: () => duplicateMutation.mutate(productId),
                          },
                          {
                            label: "Delete",
                            variant: "danger",
                            onClick: () => setDeleteId(productId),
                          },
                          ...(product.status === "draft"
                            ? [
                                {
                                  label: "Publish",
                                  variant: "primary" as const,
                                  onClick: () => publishMutation.mutate(productId),
                                },
                              ]
                            : []),
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
          onPageChange={setOffset}
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
        This will archive the product. You can duplicate it later if needed.
      </Modal>
    </div>
  )
}
