import type { ReactNode } from "react"
import { stores } from "../lib/config"

export const money = (value?: number | null) =>
  typeof value === "number" ? `$${value.toFixed(2)}` : "Price pending"

export const productImage = (url?: string | null) =>
  url || "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=80"

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "good" | "warn" | "bad" | "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Panel({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="panel">
      {(title || action) && (
        <div className="panel-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StoreSelector({ storeId, onChange }: { storeId: string; onChange: (value: string) => void }) {
  return (
    <label className="field compact">
      <span>Store</span>
      <select value={storeId} onChange={(event) => onChange(event.target.value)}>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  )
}

export function DebugPanel({ data }: { data: unknown }) {
  return (
    <details className="debug">
      <summary>Debug payload</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  )
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return <div className="loading">{label}...</div>
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "good" | "warn" | "bad" }) {
  return <div className={`notice notice-${tone}`}>{children}</div>
}
