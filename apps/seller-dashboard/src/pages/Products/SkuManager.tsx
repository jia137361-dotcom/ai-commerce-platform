import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import { PageHeader } from "../../components/PageHeader"
import { useToast } from "../../components/ToastProvider"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { Input, Label } from "../../components/ui/Input"
import { Modal } from "../../components/ui/Modal"
import { EmptyState, TableSkeleton } from "../../components/ui/EmptyState"
import { Pagination } from "../../components/ui/Pagination"

type Sku = {
  sku_id: string
  product_id: string
  product_title: string
  product_status: string
  image_url?: string | null
  supplier_name?: string | null
  supplier_product_id?: string | null
  supplier_external_product_id?: string | null
  supplier_variant_id: string
  supplier_external_variant_id?: string | null
  platform_sku: string
  supplier_sku?: string | null
  color?: string | null
  size?: string | null
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  cost?: number | null
  default_price?: number | null
  price_override?: number | null
  final_price?: number | null
  enabled: boolean
  warehouse_name?: string | null
  ship_from_country?: string | null
  print_specs?: Array<Record<string, unknown>>
}

type SkuResponse = {
  count: number
  skus: Sku[]
  limit: number
  offset: number
}

const supplierCost = (value?: number | null) =>
  value == null ? "—" : `CNY ¥${Number(value).toFixed(2)}`
const money = (value?: number | null) =>
  value == null ? "—" : `$${Number(value).toFixed(2)}`

/** SKU pricing & enablement — reached from Products (not a separate nav item). */
export function SkuManagerPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id: routeProductId } = useParams<{ id?: string }>()
  const productId = routeProductId?.trim() || null
  const [q, setQ] = useState("")
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkPrice, setBulkPrice] = useState("")
  const [detail, setDetail] = useState<Sku | null>(null)

  useEffect(() => {
    setPage(0)
    setSelected(new Set())
    setDetail(null)
  }, [productId])

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      limit: "50",
      offset: String(page * 50),
    })
    if (q.trim()) params.set("q", q.trim())
    if (productId) params.set("product_id", productId)
    return params.toString()
  }, [page, productId, q])

  const skuQuery = useQuery({
    queryKey: ["global-skus", queryString],
    queryFn: () => apiFetch<SkuResponse>(`/admin/skus?${queryString}`),
  })
  const skus = skuQuery.data?.skus ?? []

  const save = useMutation({
    mutationFn: (input: {
      product_id: string
      updates: Array<{
        supplier_variant_id: string
        price_override?: number | null
        enabled?: boolean
      }>
    }) => apiFetch("/admin/skus", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-skus"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.push("SKU settings saved", "success")
    },
    onError: (error: unknown) =>
      toast.push(
        error instanceof Error ? error.message : "Could not save SKU settings",
        "error",
      ),
  })

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const updateSku = (
    sku: Sku,
    update: { price_override?: number | null; enabled?: boolean },
  ) =>
    save.mutate({
      product_id: sku.product_id,
      updates: [{ supplier_variant_id: sku.supplier_variant_id, ...update }],
    })

  const runBulk = (mode: "price" | "clear" | "enable" | "disable") => {
    const chosen = skus.filter((sku) => selected.has(sku.sku_id))
    if (!chosen.length) return toast.push("Select at least one SKU", "error")
    const price = Number(bulkPrice)
    if (mode === "price" && (!Number.isFinite(price) || price <= 0))
      return toast.push("Enter a price greater than zero", "error")
    const grouped = new Map<string, Sku[]>()
    chosen.forEach((sku) =>
      grouped.set(sku.product_id, [...(grouped.get(sku.product_id) ?? []), sku]),
    )
    Promise.all(
      [...grouped.entries()].map(([id, rows]) =>
        save.mutateAsync({
          product_id: id,
          updates: rows.map((sku) => ({
            supplier_variant_id: sku.supplier_variant_id,
            ...(mode === "price" ? { price_override: price } : {}),
            ...(mode === "clear" ? { price_override: null } : {}),
            ...(mode === "enable" ? { enabled: true } : {}),
            ...(mode === "disable" ? { enabled: false } : {}),
          })),
        }),
      ),
    )
      .then(() => {
        setSelected(new Set())
        setBulkOpen(false)
      })
      .catch(() => undefined)
  }

  const scopedTitle = productId
    ? skus[0]?.product_title
      ? `SKUs · ${skus[0].product_title}`
      : "Product SKUs"
    : "All SKUs"

  return (
    <div>
      <PageHeader
        title={scopedTitle}
        description="Price overrides, enable/disable, and supplier fulfillment mapping for product variants."
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/products">
              <Button variant="outline">← Back to Products</Button>
            </Link>
            {productId ? (
              <Link to={`/products/${productId}/edit`}>
                <Button variant="outline">Edit product</Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="min-w-[260px] flex-1"
            placeholder="Search platform SKU, supplier SKU or ID"
            value={q}
            onChange={(event) => {
              setQ(event.target.value)
              setPage(0)
            }}
          />
          {productId ? (
            <Button
              variant="ghost"
              onClick={() => {
                setPage(0)
                setSelected(new Set())
                navigate("/products/skus")
              }}
            >
              Show all SKUs
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">
            {productId ? "Product SKU detail" : "All supplier SKUs"}
          </p>
          <p className="text-sm text-slate-500">
            Supplier costs are read-only. Published SKU changes immediately affect purchase availability.
          </p>
        </div>
        <Button variant="outline" disabled={!selected.size} onClick={() => setBulkOpen(true)}>
          Bulk actions{selected.size ? ` (${selected.size})` : ""}
        </Button>
      </Card>

      <Card className="overflow-x-auto p-0">
        {skuQuery.isLoading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : skus.length === 0 ? (
          <EmptyState
            title="No SKUs found"
            description={
              productId
                ? "This product has no supplier SKUs yet. Check the product edit page or supplier sync."
                : "No supplier SKU matches this filter."
            }
          />
        ) : (
          <table className="min-w-[1500px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={skus.length > 0 && selected.size === skus.length}
                    onChange={() =>
                      setSelected(
                        selected.size === skus.length
                          ? new Set()
                          : new Set(skus.map((sku) => sku.sku_id)),
                      )
                    }
                  />
                </th>
                <th className="px-4 py-3">Platform SKU</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Provider mapping</th>
                <th className="px-4 py-3">Color / Size</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Weight</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Default</th>
                <th className="px-4 py-3 text-right">Override</th>
                <th className="px-4 py-3 text-right">Final</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {skus.map((sku) => (
                <tr key={sku.sku_id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(sku.sku_id)}
                      onChange={() => toggle(sku.sku_id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {sku.platform_sku}
                    <br />
                    <span className="text-slate-400">{sku.supplier_sku || "No supplier SKU"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="max-w-[220px] truncate text-left font-medium text-brand"
                      onClick={() => {
                        setPage(0)
                        setSelected(new Set())
                        navigate(`/products/${sku.product_id}/skus`)
                      }}
                    >
                      {sku.product_title}
                    </button>
                    <br />
                    <span className="text-xs text-slate-400">{sku.product_status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    S2BDIY
                    <br />
                    P: {sku.supplier_external_product_id || sku.supplier_product_id || "—"}
                    <br />
                    V: {sku.supplier_external_variant_id || sku.supplier_variant_id}
                  </td>
                  <td className="px-4 py-3">
                    {sku.color || "—"} / {sku.size || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {sku.warehouse_name || sku.ship_from_country || "Not provided"}
                  </td>
                  <td className="px-4 py-3 text-right">{sku.weight ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{supplierCost(sku.cost)}</td>
                  <td className="px-4 py-3 text-right">{money(sku.default_price)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-brand" onClick={() => setDetail(sku)}>
                      {money(sku.price_override)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{money(sku.final_price)}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => updateSku(sku, { enabled: !sku.enabled })}>
                      <Badge label={sku.enabled ? "Enabled" : "Disabled"} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={() => setDetail(sku)}>
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Pagination
        offset={page * 50}
        limit={50}
        count={skuQuery.data?.count ?? 0}
        onPageChange={(offset) => {
          setPage(offset / 50)
          setSelected(new Set())
        }}
        label={`${skus.length} of ${skuQuery.data?.count ?? 0} SKUs`}
      />

      <Modal
        open={bulkOpen}
        title="Bulk SKU actions"
        onClose={() => setBulkOpen(false)}
        footer={
          <Button variant="outline" onClick={() => setBulkOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Apply an action to {selected.size} selected SKU
            {selected.size === 1 ? "" : "s"}.
          </p>
          <div>
            <Label>SKU override price (USD)</Label>
            <div className="mt-2 flex gap-2">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={bulkPrice}
                onChange={(event) => setBulkPrice(event.target.value)}
              />
              <Button onClick={() => runBulk("price")}>Set override</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => runBulk("clear")}>
              Clear override
            </Button>
            <Button variant="outline" onClick={() => runBulk("enable")}>
              Enable SKU
            </Button>
            <Button variant="outline" onClick={() => runBulk("disable")}>
              Disable SKU
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={Boolean(detail)}
        title="SKU fulfillment mapping"
        onClose={() => setDetail(null)}
        footer={
          <Button variant="outline" onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        <div className="space-y-3 text-sm">
          {detail ? (
            <>
              <p>
                <strong>Platform SKU:</strong> {detail.platform_sku}
              </p>
              <p>
                <strong>Supplier:</strong> S2BDIY · Product{" "}
                {detail.supplier_external_product_id || detail.supplier_product_id} · Variant{" "}
                {detail.supplier_external_variant_id || detail.supplier_variant_id}
              </p>
              <p>
                <strong>Warehouse / ship from:</strong>{" "}
                {detail.warehouse_name || detail.ship_from_country || "Not provided by supplier"}
              </p>
              <p>
                <strong>Dimensions:</strong> {detail.weight ?? "—"} weight · {detail.length ?? "—"} ×{" "}
                {detail.width ?? "—"} × {detail.height ?? "—"}
              </p>
              <p>
                <strong>Cost:</strong> {supplierCost(detail.cost)} (read-only)
              </p>
              <div>
                <Label>Override price</Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="number"
                    defaultValue={detail.price_override ?? ""}
                    placeholder="Use product default"
                    onChange={(event) => setBulkPrice(event.target.value)}
                  />
                  <Button
                    onClick={() => {
                      const value = bulkPrice === "" ? null : Number(bulkPrice)
                      if (value !== null && (!Number.isFinite(value) || value <= 0))
                        return toast.push("Enter a price greater than zero", "error")
                      updateSku(detail, { price_override: value })
                      setDetail(null)
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
              <p>
                <strong>Print specs:</strong> {detail.print_specs?.length ?? 0} mapped print view(s)
              </p>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
