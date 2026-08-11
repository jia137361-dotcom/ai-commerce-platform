import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "../../../components/ui/Button"
import { Card } from "../../../components/ui/Card"
import { EmptyState } from "../../../components/ui/EmptyState"
import { useToast } from "../../../components/ToastProvider"
import {
  downloadText,
  exportAllFilteredS2bCsv,
  exportS2bCsv,
  fetchImportedDrafts,
  fetchS2bCategories,
  fetchS2bCatalog,
  fetchS2bDetail,
  importS2bCsv,
  previewS2bCsv,
  publishImportedDrafts,
  type ImportedDraftProduct,
  type S2bCategory,
  type S2bCatalogItem,
} from "./api"

type WorkspaceTab = "export" | "import" | "drafts"

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "export", label: "Export S2B Products" },
  { id: "import", label: "Import CSV" },
  { id: "drafts", label: "Imported Drafts" },
]

const readMetaString = (product: ImportedDraftProduct, key: string) =>
  typeof product.metadata?.[key] === "string" ? String(product.metadata[key]) : ""

const readMetaList = (product: ImportedDraftProduct, key: string) =>
  Array.isArray(product.metadata?.[key])
    ? (product.metadata[key] as unknown[]).map((value) => String(value))
    : []

const flattenS2bCategories = (categories: S2bCategory[], depth = 0): Array<{ id: number; label: string }> =>
  categories.flatMap((category) => {
    const label = `${"  ".repeat(depth)}${category.en_name || category.name || `Category ${category.id}`}`
    return [
      { id: category.id, label },
      ...flattenS2bCategories(category.children ?? [], depth + 1),
    ]
  })

function ExportPanel() {
  const toast = useToast()
  const [keyword, setKeyword] = useState("")
  const [search, setSearch] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [shippingFrom, setShippingFrom] = useState("")
  const [selected, setSelected] = useState<number[]>([])

  const params = new URLSearchParams({
    supplier_id: "sup_s2bdiy",
    page: "1",
    per_page: "24",
  })
  if (search) params.set("keyword", search)
  if (categoryId) params.set("category_id", categoryId)

  const catalog = useQuery({
    queryKey: ["s2b-export-catalog", search, categoryId],
    queryFn: () => fetchS2bCatalog(params),
  })

  const categoryQuery = useQuery({
    queryKey: ["s2b-categories"],
    queryFn: fetchS2bCategories,
  })

  const detailQueries = useQuery({
    queryKey: ["s2b-export-details", catalog.data?.data?.map((item) => item.id).join(",")],
    queryFn: async () => {
      const entries = await Promise.all((catalog.data?.data ?? []).map(async (item) => {
        try {
          const detail = await fetchS2bDetail(item.id)
          return [item.id, detail.data] as const
        } catch {
          return [item.id, null] as const
        }
      }))
      return new Map(entries)
    },
    enabled: Boolean(catalog.data?.data?.length),
  })

  const visibleItems = useMemo(() => {
    const items = catalog.data?.data ?? []
    if (!shippingFrom.trim()) return items
    const query = shippingFrom.trim().toLowerCase()
    return items.filter((item) => {
      const detail = detailQueries.data?.get(item.id)
      return JSON.stringify(detail ?? item).toLowerCase().includes(query)
    })
  }, [catalog.data?.data, detailQueries.data, shippingFrom])

  const categories = useMemo(
    () => flattenS2bCategories(categoryQuery.data?.categories ?? []),
    [categoryQuery.data?.categories]
  )

  const exportMutation = useMutation({
    mutationFn: exportS2bCsv,
    onSuccess: (result) => {
      downloadText(result.filename, result.csv)
      toast.push("CSV exported", "success")
    },
    onError: (error: Error) => toast.push(error.message, "error"),
  })
  const exportAllMutation = useMutation({
    mutationFn: () => exportAllFilteredS2bCsv({ keyword: search, categoryId }),
    onSuccess: (result) => {
      downloadText(result.filename.replace(".csv", "-all.csv"), result.csv)
      toast.push("All filtered S2B products exported", "success")
    },
    onError: (error: Error) => toast.push(error.message, "error"),
  })

  const toggle = (id: number) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((item) => selected.includes(item.id))

  return (
    <Card className="p-4">
      <form
        className="mb-4 grid gap-3 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(keyword.trim())
          setSelected([])
        }}
      >
        <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">All S2B categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </select>
        <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Shipping from" value={shippingFrom} onChange={(event) => setShippingFrom(event.target.value)} />
        <Button type="submit">Search</Button>
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>{visibleItems.length} products · {visibleItems.reduce((sum, item) => sum + (detailQueries.data?.get(item.id)?.items?.length ?? 0), 0)} SKUs</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelected(allVisibleSelected ? [] : visibleItems.map((item) => item.id))}>
            {allVisibleSelected ? "Clear visible" : "Select visible"}
          </Button>
          <Button size="sm" disabled={!selected.length || exportMutation.isPending} onClick={() => exportMutation.mutate(selected)}>
            {exportMutation.isPending ? "Exporting..." : `Export selected (${selected.length})`}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={exportAllMutation.isPending}
            onClick={() => exportAllMutation.mutate()}
          >
            {exportAllMutation.isPending ? "Exporting all..." : "Export all filtered"}
          </Button>
        </div>
      </div>

      {catalog.isLoading ? <p className="text-sm text-slate-500">Loading S2B products...</p> : null}
      {catalog.isError ? <EmptyState title="Could not load S2B catalog" description={catalog.error instanceof Error ? catalog.error.message : "Supplier API unavailable"} /> : null}
      {!catalog.isLoading && !visibleItems.length ? <EmptyState title="No S2B products found" description="Try another keyword or category." /> : null}
      {visibleItems.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Pick</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">SKU count</th>
                <th className="px-3 py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item: S2bCatalogItem) => {
                const detail = detailQueries.data?.get(item.id)
                return (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {item.view_image_src || item.blank_design_image ? <img src={item.view_image_src || item.blank_design_image} alt="" className="h-10 w-10 rounded object-cover" /> : null}
                        <div><strong>{item.en_name || item.name || item.id}</strong><p className="text-xs text-slate-500">S2B #{item.id}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{(item.categorys ?? []).map((category) => category.en_name || category.name).filter(Boolean).join(", ") || "—"}</div>
                      {item.synced_product ? (
                        <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          {item.synced_product.status}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{detail?.items?.length ?? "…"}</td>
                    <td className="px-3 py-2">{item.purchase_price ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  )
}

function ImportPanel() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [csv, setCsv] = useState("")

  const previewMutation = useMutation({
    mutationFn: previewS2bCsv,
    onError: (error: Error) => toast.push(error.message, "error"),
  })
  const importMutation = useMutation({
    mutationFn: importS2bCsv,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["s2b-imported-drafts"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.push(`${result.imported_product_ids.length} draft product(s) imported`, "success")
    },
    onError: (error: Error) => toast.push(error.message, "error"),
  })

  const preview = previewMutation.data ?? importMutation.data?.preview

  return (
    <Card className="p-4">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <input
          type="file"
          accept=".csv,text/csv"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            void file.text().then((text) => {
              setCsv(text)
              previewMutation.reset()
              importMutation.reset()
            })
          }}
        />
        <Button variant="outline" disabled={!csv || previewMutation.isPending} onClick={() => previewMutation.mutate(csv)}>
          {previewMutation.isPending ? "Checking..." : "Preview"}
        </Button>
        <Button disabled={!csv || !preview?.valid_rows || importMutation.isPending} onClick={() => importMutation.mutate(csv)}>
          {importMutation.isPending ? "Importing..." : "Import valid rows"}
        </Button>
      </div>
      {csv ? <p className="mb-3 text-xs text-slate-500">{csv.split(/\r?\n/).filter(Boolean).length - 1} CSV data rows loaded.</p> : null}
      {preview ? (
        <div>
          <p className="mb-3 text-sm text-slate-700">
            {preview.valid_rows} valid · {preview.invalid_rows} invalid · {preview.total_rows} total
          </p>
          <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-left uppercase text-slate-500">
                <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Product</th><th className="px-3 py-2">Variant</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Errors</th></tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.row_number} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.row_number}</td>
                    <td className="px-3 py-2">{row.source_product_id}</td>
                    <td className="px-3 py-2">{row.source_variant_id}</td>
                    <td className="px-3 py-2">{row.publish_action}</td>
                    <td className={row.valid ? "px-3 py-2 text-emerald-700" : "px-3 py-2 text-red-600"}>
                      {row.valid ? "OK" : row.errors.join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="Upload a CSV to preview" description="Valid rows can be imported into Draft. Invalid rows stay visible with row-level errors." />
      )}
    </Card>
  )
}

function DraftsPanel() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>([])
  const [filters, setFilters] = useState({
    status: "all",
    category: "",
    product_type: "",
    warehouse_region: "",
    country: "",
  })

  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") params.set(key, value)
  })

  const query = useQuery({
    queryKey: ["s2b-imported-drafts", filters],
    queryFn: () => fetchImportedDrafts(params),
  })

  const products = query.data?.products ?? []
  const publishMutation = useMutation({
    mutationFn: publishImportedDrafts,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["s2b-imported-drafts"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setSelected([])
      toast.push(`${result.published_count} published${result.failed_count ? `, ${result.failed_count} failed` : ""}`, result.failed_count ? "error" : "success")
    },
    onError: (error: Error) => toast.push(error.message, "error"),
  })

  const allSelected = products.length > 0 && products.every((product) => selected.includes(product.product_id))
  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setSelected([])
  }

  return (
    <Card className="p-4">
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
        </select>
        <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Category" value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} />
        <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Product type" value={filters.product_type} onChange={(event) => updateFilter("product_type", event.target.value)} />
        <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Shipping from" value={filters.warehouse_region} onChange={(event) => updateFilter("warehouse_region", event.target.value)} />
        <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Sellable country" value={filters.country} onChange={(event) => updateFilter("country", event.target.value.toUpperCase())} />
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-slate-600">{products.length} imported products · {selected.length} selected</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelected(allSelected ? [] : products.map((product) => product.product_id))}>
            {allSelected ? "Clear" : "Select filtered"}
          </Button>
          <Button size="sm" disabled={!selected.length || publishMutation.isPending} onClick={() => publishMutation.mutate({ product_ids: selected })}>
            {publishMutation.isPending ? "Publishing..." : "Publish selected"}
          </Button>
        </div>
      </div>
      {publishMutation.data?.failed?.length ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Some products were not published:</strong>
          <ul className="mt-1 space-y-1">
            {publishMutation.data.failed.map((row) => (
              <li key={row.product_id}>{row.product_id}: {row.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {query.isLoading ? <p className="text-sm text-slate-500">Loading imported drafts...</p> : null}
      {query.isError ? <EmptyState title="Could not load imported drafts" description={query.error instanceof Error ? query.error.message : "Backend unavailable"} /> : null}
      {!query.isLoading && !products.length ? <EmptyState title="No imported drafts" description="Export S2B products, edit the CSV, then import valid rows." /> : null}
      {products.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-3 py-2">Pick</th><th className="px-3 py-2">Product</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Shipping</th><th className="px-3 py-2">Countries</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Action</th></tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const status = product.metadata?.import_status === "failed" ? "failed" : product.status
                return (
                  <tr key={product.product_id} className="border-t border-slate-100">
                    <td className="px-3 py-2"><input type="checkbox" checked={selected.includes(product.product_id)} onChange={() => setSelected((current) => current.includes(product.product_id) ? current.filter((id) => id !== product.product_id) : [...current, product.product_id])} /></td>
                    <td className="px-3 py-2"><strong>{product.title}</strong><p className="text-xs text-slate-500">{product.variants?.length ?? 0} variants · {product.product_id}</p></td>
                    <td className="px-3 py-2">{[readMetaString(product, "category_level_1"), readMetaString(product, "category_level_2")].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-3 py-2">{readMetaString(product, "product_type") || "—"}</td>
                    <td className="px-3 py-2">{readMetaString(product, "warehouse_region") || product.ship_from_label || "—"}</td>
                    <td className="px-3 py-2">{readMetaList(product, "sellable_country_codes").join(", ") || "—"}</td>
                    <td className="px-3 py-2">{status}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" disabled={status === "published" || publishMutation.isPending} onClick={() => publishMutation.mutate({ product_ids: [product.product_id] })}>
                        Publish
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  )
}

export function S2bImportWorkspace() {
  const [tab, setTab] = useState<WorkspaceTab>("export")
  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm ${tab === item.id ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600"}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "export" ? <ExportPanel /> : tab === "import" ? <ImportPanel /> : <DraftsPanel />}
    </section>
  )
}
