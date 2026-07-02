type Props = {
  status: string
  source?: string | null
  metadata?: Record<string, unknown>
}

const failedMeta = (metadata?: Record<string, unknown>) =>
  metadata?.generation_failed === true ||
  (typeof metadata?.s2b_provision_error === "string" && metadata.s2b_provision_error.length > 0)

export const resolveStatusBadgeLabel = (
  status: string,
  source?: string | null,
  metadata?: Record<string, unknown>
) => {
  const failed = source === "ai" && failedMeta(metadata)
  return failed ? "Failed" : status
}

export function StatusBadge({ status, source, metadata }: Props) {
  const label = resolveStatusBadgeLabel(status, source, metadata)
  const failed = label === "Failed"
  const color = failed
    ? "bg-red-100 text-red-800"
    : status === "published"
      ? "bg-green-100 text-green-800"
      : status === "draft"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-200 text-slate-700"

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${color}`}>
      {label}
    </span>
  )
}
