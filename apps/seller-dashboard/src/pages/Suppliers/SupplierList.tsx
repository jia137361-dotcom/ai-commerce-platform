import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import { Card } from "../../components/ui/Card"

type Supplier = {
  id: string
  code: string
  name: string
  country: string | null
  adapter_type: string
  status: string
  adapter_ready: boolean
}

export function SupplierListPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<{ suppliers: Supplier[] }>("/admin/suppliers"),
  })

  const suppliers = data?.suppliers ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse supplier catalogs and sync products to your store.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-500">No suppliers found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/suppliers/${s.id}/catalog`)}
              className="rounded-xl border border-slate-200 bg-white p-6 text-left shadow-card transition hover:border-brand hover:shadow-lg"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-light text-lg font-bold text-brand">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{s.name}</h3>
                  <p className="text-xs text-slate-500">{s.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.adapter_ready
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {s.adapter_ready ? "Ready" : "Coming Soon"}
                </span>
                <span className="text-xs text-slate-400">· {s.adapter_type}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
