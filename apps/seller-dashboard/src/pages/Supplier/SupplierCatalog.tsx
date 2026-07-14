import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import { useToast } from "../../components/ToastProvider"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"

type S2bProduct = {
  id: number
  code: string
  name: string
  en_name: string
  purchase_price: string
  view_image_src: string
  blank_design_image: string
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
  category_id: string
  name: string
  supplier_category_id: string | null
}

export function SupplierCatalogPage() {
  const navigate = useNavigate()
  const { supplierId } = useParams<{ supplierId: string }>()
  const qc = useQueryClient()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [selId, setSelId] = useState<number | null>(null)
  const [catId, setCatId] = useState<number | null>(null)
  const pp = 12

  const { data: categoryData } = useQuery({
    queryKey: ["product-categories"],
    queryFn: () =>
      apiFetch<{ categories: StoreCategory[] }>("/admin/product-categories"),
  })

  const catalogCategories = useMemo(() => {
    const seen = new Map<number, string>()
    for (const category of categoryData?.categories ?? []) {
      if (!category.supplier_category_id) continue
      const id = Number(category.supplier_category_id)
      if (!Number.isFinite(id) || id <= 0) continue
      if (!seen.has(id)) seen.set(id, category.name)
    }
    return [...seen.entries()]
      .map(([id, label]) => ({ id, label }))
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
  const det = detailData?.data ?? null
  const total = listData?.total

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button type="button" onClick={() => navigate("/suppliers")} className="hover:text-brand">Suppliers</button>
            <span>/</span>
            <span className="text-slate-600">{supplierId}</span>
          </div>
          <h1 className="mt-1 text-xl font-bold">Supplier Catalog</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/suppliers")}>Back to Suppliers</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Card className="p-3">
            <div className="mb-3 flex flex-wrap gap-1">
              <span
                role="button"
                tabIndex={0}
                onClick={() => { setCatId(null); setPage(1); setSelId(null) }}
                onKeyDown={(e) => { if (e.key === "Enter") { setCatId(null); setPage(1); setSelId(null) } }}
                className={
                  "cursor-pointer rounded-full px-2 py-0.5 text-xs " +
                  (catId == null ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                }
              >
                All
              </span>
              {catalogCategories.map((c) => (
                <span
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setCatId(catId === c.id ? null : c.id); setPage(1); setSelId(null) }}
                  onKeyDown={(e) => { if (e.key === "Enter") { setCatId(catId === c.id ? null : c.id); setPage(1); setSelId(null) } }}
                  className={
                    "cursor-pointer rounded-full px-2 py-0.5 text-xs " +
                    (catId === c.id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")
                  }
                >
                  {c.label}
                </span>
              ))}
            </div>
            {!catalogCategories.length ? (
              <p className="mb-3 text-xs text-slate-500">
                No supplier-linked categories yet. Sync a catalog item or import S2B categories first.
              </p>
            ) : null}

            <div className="mb-2 text-xs text-gray-500">
              {total != null ? total + " products" : "Loading..."}
            </div>

            {isLoading ? (
              <div className="space-y-1">
                {[1,2,3,4,5].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />)}
              </div>
            ) : items.length === 0 ? (
              <p className="text-xs text-gray-400">No products found</p>
            ) : (
              <div className="max-h-[500px] space-y-1 overflow-y-auto">
                {items.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelId(p.id)}
                    className={
                      "w-full rounded border p-2 text-left text-xs " +
                      (selId === p.id ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:bg-gray-50")
                    }
                  >
                    {p.view_image_src ? (
                      <img src={p.view_image_src} alt="" className="mb-1 h-10 w-10 rounded object-cover" />
                    ) : null}
                    <div className="truncate font-medium">{p.name}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 flex justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <span className="text-xs text-gray-400">P{page}</span>
              <Button variant="outline" size="sm" disabled={items.length < pp} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!selId ? (
            <Card className="flex h-48 items-center justify-center">
              <p className="text-sm text-gray-400">Select a product</p>
            </Card>
          ) : detLoading ? (
            <Card className="p-4"><div className="h-40 animate-pulse rounded bg-gray-100" /></Card>
          ) : det ? (
            <Card className="p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{det.name}</h2>
                  <p className="text-xs text-gray-500">ID: {det.id}</p>
                </div>
                <Button size="sm" onClick={() => sync.mutate(det.id)} disabled={sync.isPending}>
                  {sync.isPending ? "Syncing..." : "Sync to Store"}
                </Button>
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
    </div>
  )
}
