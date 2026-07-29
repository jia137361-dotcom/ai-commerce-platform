import { useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import { useToast } from "../../components/ToastProvider"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { S2bImportWorkspace } from "../Products/s2b-import/S2bImportWorkspace"

type S2bProduct = {
  id: number
  code: string
  name: string
  en_name: string
  purchase_price: string
  view_image_src: string
  blank_design_image: string
  produce_country?: string
  warehouse_name?: string
  deliver_goods_text?: string
  synced_product?: {
    product_id: string
    status: string
    title?: string
  } | null
}

type S2bProductDetail = {
  id: number
  code: string
  name: string
  en_name: string
  purchase_price: string
  colors: Array<{ id: number; name: string; en_name: string; tone: string }>
  sizes: Array<{ id: number; name: string }>
  print_areas: Array<{ view_id: number; width: string; height: string }>
  product_show_images: Array<{ color_id: number; color_name: string; images: Array<{ src: string }> }>
  categorys: Array<{ id: number; name: string; en_name: string }>
  produce_country?: string
  warehouse_name?: string
  deliver_goods_text?: string
}

type SyncResult = {
  supplier_product_id: string
  basic_product_id: number
  variant_count: number
  view_count: number
}

type CatalogResponse = {
  data: S2bProduct[]
  total: number
  page: number
  per_page: number
  last_page: number
}

type StoreCategory = {
  id: number
  name?: string
  en_name?: string
  children?: StoreCategory[]
}

const flattenCategories = (categories: StoreCategory[], depth = 0): Array<{ id: number; label: string }> =>
  categories.flatMap((category) => {
    const label = `${"  ".repeat(depth)}${category.en_name || category.name || `Category ${category.id}`}`
    return [{ id: category.id, label }, ...flattenCategories(category.children ?? [], depth + 1)]
  })

const resolveShippingRegion = (product: Partial<S2bProduct | S2bProductDetail>) => {
  const direct = [
    product.warehouse_name,
    product.produce_country,
    product.deliver_goods_text,
  ].find((value) => typeof value === "string" && value.trim())
  if (direct) return direct.trim()
  const title = [product.name, product.en_name].filter(Boolean).join(" ")
  const match = title.match(/[（(]([^）)]*(?:发|仓|工厂)[^）)]*)[）)]/)
  return match?.[1]?.trim() || "Unknown region"
}

export function SupplierCatalogPage() {
  const navigate = useNavigate()
  const { supplierId } = useParams<{ supplierId: string }>()
  const qc = useQueryClient()
  const toast = useToast()
  const categoryScrollerRef = useRef<HTMLDivElement | null>(null)
  const [page, setPage] = useState(1)
  const [selId, setSelId] = useState<number | null>(null)
  const [catId, setCatId] = useState<number | null>(null)
  const [regionFilter, setRegionFilter] = useState("")
  const pp = 12

  const { data: categoryData } = useQuery({
    queryKey: ["s2bdiy-categories"],
    queryFn: () =>
      apiFetch<{ categories: StoreCategory[] }>("/admin/s2bdiy/categories"),
  })

  const catalogCategories = useMemo(() => {
    return flattenCategories(categoryData?.categories ?? [])
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [categoryData])

  const { data: listData, isLoading } = useQuery({
    queryKey: ["s2b", supplierId, page, catId],
    queryFn: () => {
      const p = new URLSearchParams({ supplier_id: supplierId!, page: String(page), per_page: String(pp) })
      if (catId) p.set("category_id", String(catId))
      return apiFetch<CatalogResponse>("/admin/supplier-catalog?" + p.toString())
    },
    enabled: !!supplierId,
  })

  const { data: detailData, isLoading: detLoading } = useQuery({
    queryKey: ["s2bd", supplierId, selId],
    queryFn: () => apiFetch<{ data: S2bProductDetail }>("/admin/supplier-catalog/" + selId + "?supplier_id=" + supplierId),
    enabled: selId !== null && !!supplierId,
  })

  const sync = useMutation({
    mutationFn: async (bid: number) => {
      const r = await apiFetch<SyncResult & { category_ids?: string[] }>("/admin/supplier-products/sync-basic-product", {
        method: "POST",
        body: JSON.stringify({ basic_product_id: bid, supplier_id: supplierId }),
      })
      const d = await apiFetch<{ product_id: string }>("/admin/supplier-products/create-draft", {
        method: "POST",
        body: JSON.stringify({
          supplier_product_id: r.supplier_product_id,
          basic_product_id: String(bid),
          category_ids: r.category_ids ?? [],
        }),
      })
      return { ...r, product_id: d.product_id }
    },
    onSuccess: (r) => {
      toast.push("Draft created: " + r.variant_count + " variants", "success")
      qc.invalidateQueries({ queryKey: ["s2b"] })
      navigate("/products/" + r.product_id + "/edit")
    },
    onError: (e: Error) => toast.push(e.message, "error"),
  })

  const items = listData?.data ?? []
  const shippingRegions = useMemo(
    () => Array.from(new Set(items.map(resolveShippingRegion).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [items]
  )
  const visibleItems = regionFilter ? items.filter((item) => resolveShippingRegion(item) === regionFilter) : items
  const det = detailData?.data ?? null
  const total = listData?.total

  const selectedCategory = catalogCategories.find((category) => category.id === catId)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button type="button" onClick={() => navigate("/suppliers")} className="hover:text-brand">Suppliers</button>
            <span>/</span>
            <span className="text-slate-600">{supplierId === "sup_s2bdiy" ? "s2b_supplier" : supplierId}</span>
          </div>
          <h1 className="mt-1 text-xl font-bold">{supplierId === "sup_s2bdiy" ? "S2B Supplier Catalog" : "Supplier Catalog"}</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/suppliers")}>Back to Suppliers</Button>
      </div>

      <Card className="mb-4 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">S2B Categories</p>
            <p className="text-sm font-medium text-slate-700">{selectedCategory?.label.trim() || "All categories"}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => categoryScrollerRef.current?.scrollBy({ left: -360, behavior: "smooth" })}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => categoryScrollerRef.current?.scrollBy({ left: 360, behavior: "smooth" })}
            >
              Next
            </Button>
          </div>
        </div>
        <div ref={categoryScrollerRef} className="flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => { setCatId(null); setPage(1); setSelId(null) }}
            className={
              "shrink-0 rounded-full px-3 py-1 text-sm " +
              (catId == null ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")
            }
          >
            All
          </button>
          {catalogCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setCatId(catId === c.id ? null : c.id); setPage(1); setSelId(null) }}
              className={
                "shrink-0 rounded-full px-3 py-1 text-sm " +
                (catId === c.id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")
              }
            >
              {c.label.trim()}
            </button>
          ))}
        </div>
        {!catalogCategories.length ? (
          <p className="mt-2 text-xs text-slate-500">
            No S2B categories returned yet. Confirm supplier API credentials and reload.
          </p>
        ) : null}
      </Card>

      <Card className="mb-4 p-3">
        <div className="mb-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">S2B fulfillment locations</p>
          <p className="text-sm font-medium text-slate-700">{regionFilter || "All warehouses / factories"}</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => { setRegionFilter(""); setSelId(null) }}
            className={
              "shrink-0 rounded-full px-3 py-1 text-sm " +
              (!regionFilter ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")
            }
          >
            All locations
          </button>
          {shippingRegions.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => { setRegionFilter(regionFilter === region ? "" : region); setSelId(null) }}
              className={
                "shrink-0 rounded-full px-3 py-1 text-sm " +
                (regionFilter === region ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")
              }
            >
              {region}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
        <Card className="p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Products</p>
              <p className="text-sm text-gray-500">
                {total != null ? total + " products" : "Loading..."}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">P{page}</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map((i) => <div key={i} className="h-20 animate-pulse rounded bg-gray-100" />)}
            </div>
          ) : visibleItems.length === 0 ? (
            <p className="text-xs text-gray-400">No products found</p>
          ) : (
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {visibleItems.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelId(p.id)}
                  className={
                    "flex w-full items-center gap-3 rounded-lg border p-2 text-left text-sm " +
                    (selId === p.id ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:bg-gray-50")
                  }
                >
                  {p.view_image_src ? (
                    <img src={p.view_image_src} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                  ) : <span className="h-14 w-14 shrink-0 rounded bg-slate-100" />}
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <strong className="line-clamp-2 text-slate-900">{p.en_name || p.name}</strong>
                      {p.synced_product ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          {p.synced_product.status}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          unsynced
                        </span>
                      )}
                    </span>
                    <small className="block text-slate-400">S2B #{p.id} · {p.purchase_price ?? "—"} · {resolveShippingRegion(p)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex justify-between">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={items.length < pp} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </Card>

        <div>
          {!selId ? (
            <Card className="flex min-h-[360px] items-center justify-center">
              <p className="text-sm text-gray-400">Select a product from the list</p>
            </Card>
          ) : detLoading ? (
            <Card className="p-4"><div className="h-40 animate-pulse rounded bg-gray-100" /></Card>
          ) : det ? (
            <Card className="p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{det.name}</h2>
                  <p className="text-xs text-gray-500">ID: {det.id} · {resolveShippingRegion(det)}</p>
                </div>
                <Button size="sm" onClick={() => sync.mutate(det.id)} disabled={sync.isPending}>
                  {sync.isPending ? "Syncing..." : "Sync to Store"}
                </Button>
                {items.find((item) => item.id === det.id)?.synced_product?.product_id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/products/${items.find((item) => item.id === det.id)?.synced_product?.product_id}/edit`)}
                  >
                    Edit synced product
                  </Button>
                ) : null}
              </div>

              <div className="mb-3">
                <h3 className="mb-1 text-xs font-semibold text-gray-700">Colors</h3>
                <div className="flex flex-wrap gap-1">
                  {det.colors.map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px]">
                      <span className="inline-block h-2.5 w-2.5 rounded-full border" style={{ backgroundColor: c.tone }} />
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <h3 className="mb-1 text-xs font-semibold text-gray-700">Sizes</h3>
                <div className="flex flex-wrap gap-1">
                  {det.sizes.map((s) => (
                    <span key={s.id} className="rounded border px-2 py-0.5 text-[11px]">{s.name}</span>
                  ))}
                </div>
              </div>

              {det.categorys?.length ? (
                <div className="mb-3">
                  <h3 className="mb-1 text-xs font-semibold text-gray-700">Category</h3>
                  <div className="flex flex-wrap gap-1">
                    {det.categorys.map((c) => (
                      <span key={c.id} className="rounded bg-gray-100 px-2 py-0.5 text-[11px]">{c.name}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {det.product_show_images?.length ? (
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-gray-700">Images</h3>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                    {det.product_show_images.flatMap((img) =>
                      (img.images ?? []).slice(0, 1).map((src, i) => (
                        <div key={img.color_id + "-" + i} className="relative overflow-hidden rounded border">
                          <img src={src.src} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                          <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 py-px text-[9px] text-white">{img.color_name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <S2bImportWorkspace />
      </div>
    </div>
  )
}
