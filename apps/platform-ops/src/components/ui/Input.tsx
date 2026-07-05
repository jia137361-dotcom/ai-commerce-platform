import { cn } from "../../lib/cn"

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20",
        props.className
      )}
    />
  )
}

export function Label({
  children,
  className,
  htmlFor,
}: {
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-xs font-semibold uppercase tracking-wide text-slate-500", className)}
    >
      {children}
    </label>
  )
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-red-600">{message}</p>
}
