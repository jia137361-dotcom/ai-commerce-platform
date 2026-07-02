import { cn } from "../../lib/cn"

export type Step = {
  id: string
  label: string
  description?: string
  timestamp?: string | null
  status: "done" | "current" | "pending"
  progress?: number
}

export function VerticalStepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
          {index < steps.length - 1 ? (
            <span className="absolute left-4 top-8 h-[calc(100%-2rem)] w-px bg-slate-200" />
          ) : null}
          <span
            className={cn(
              "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              step.status === "done" && "bg-brand text-white",
              step.status === "current" && "border-2 border-brand bg-brand-light text-brand",
              step.status === "pending" && "border border-slate-200 bg-white text-slate-400"
            )}
          >
            {step.status === "done" ? "✓" : index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("font-semibold", step.status === "pending" ? "text-slate-400" : "text-slate-900")}>
              {step.label}
            </p>
            {step.description ? (
              <p className="mt-1 text-sm text-slate-500">{step.description}</p>
            ) : null}
            {step.status === "current" && step.progress != null ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-brand" style={{ width: `${step.progress}%` }} />
              </div>
            ) : null}
            {step.timestamp ? (
              <p className="mt-1 font-mono text-xs text-slate-400">{step.timestamp}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function HorizontalStepper({ steps }: { steps: Step[] }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex min-w-[80px] flex-1 flex-col items-center text-center">
          <div className="flex w-full items-center">
            {index > 0 ? (
              <span className={cn("h-0.5 flex-1", step.status === "pending" ? "bg-slate-200" : "bg-brand")} />
            ) : (
              <span className="flex-1" />
            )}
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                step.status === "done" && "bg-brand text-white",
                step.status === "current" && "border-2 border-brand text-brand",
                step.status === "pending" && "border border-slate-200 text-slate-400"
              )}
            >
              {step.status === "done" ? "✓" : index + 1}
            </span>
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  "h-0.5 flex-1",
                  steps[index + 1]?.status === "pending" ? "bg-slate-200" : "bg-brand"
                )}
              />
            ) : (
              <span className="flex-1" />
            )}
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600">{step.label}</p>
        </div>
      ))}
    </div>
  )
}
