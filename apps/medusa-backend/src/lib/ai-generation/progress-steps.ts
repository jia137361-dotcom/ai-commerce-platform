export const AI_JOB_STEPS = [
  { key: "queued", label: "Queued", progress: 5 },
  { key: "calling_ai_worker", label: "Generating design", progress: 35 },
  { key: "creating_draft", label: "Creating product draft", progress: 70 },
  { key: "s2b_provision", label: "Provisioning supplier product", progress: 90 },
  { key: "complete", label: "Complete", progress: 100 },
] as const

export type AiJobStepKey = (typeof AI_JOB_STEPS)[number]["key"]

export const getStepProgress = (stepKey: string): number => {
  const step = AI_JOB_STEPS.find((s) => s.key === stepKey)
  return step?.progress ?? 0
}

export const serializeAiJob = (job: Record<string, unknown>) => ({
  job_id: job.id,
  store_id: job.store_id,
  status: job.status,
  progress: job.progress ?? 0,
  current_step: job.current_step ?? null,
  estimated_seconds: job.estimated_seconds ?? null,
  product_id: job.product_id ?? null,
  error: job.error ?? null,
  result: job.result ?? null,
  payload: job.payload ?? null,
  created_at: job.created_at,
  updated_at: job.updated_at,
})
