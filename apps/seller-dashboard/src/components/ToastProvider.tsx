import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { cn } from "../lib/cn"

type ToastItem = {
  id: string
  message: string
  variant: "success" | "error" | "info"
}

type ToastContextValue = {
  push: (message: string, variant?: ToastItem["variant"]) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, variant: ToastItem["variant"] = "info") => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev, { id, message, variant }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg",
              item.variant === "success" && "bg-emerald-600",
              item.variant === "error" && "bg-red-600",
              item.variant === "info" && "bg-slate-800"
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}
