import type { FulfillmentTimelineStep } from "@ai-commerce/shared-types"

type Props = { steps: FulfillmentTimelineStep[] }

export function FulfillmentTimeline({ steps }: Props) {
  return (
    <ol className="space-y-4">
      {steps.map((step) => (
        <li key={step.key} className="flex gap-3">
          <div
            className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
              step.status === "completed"
                ? "bg-green-500"
                : step.status === "active"
                  ? "bg-blue-500"
                  : "bg-slate-300"
            }`}
          />
          <div>
            <p className="font-medium">{step.label}</p>
            {step.timestamp ? (
              <p className="text-xs text-slate-500">{new Date(step.timestamp).toLocaleString()}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
