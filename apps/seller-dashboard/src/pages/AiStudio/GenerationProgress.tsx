import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { apiFetch, MEDUSA_URL } from "../../lib/api-client"
import { useToast } from "../../components/ToastProvider"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { Card, CardTitle } from "../../components/ui/Card"
import { ProgressBar } from "../../components/ui/ProgressBar"
import type { AiJobProgress } from "@ai-commerce/shared-types"

type JobResponse = AiJobProgress & {
  prompt?: string
  result?: {
    generation?: Record<string, string>
    product?: Record<string, unknown>
  } | null
}

type ProgressLocationState = {
  prompt?: string
  productName?: string
  marketplaceCategory?: string
}

export function GenerationProgressPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [job, setJob] = useState<JobResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const state = (location.state ?? {}) as ProgressLocationState
  const displayPrompt = job?.prompt ?? state.prompt ?? "—"
  const displayProductName = state.productName ?? "Custom merchandise"
  const displayCategory = state.marketplaceCategory

  useEffect(() => {
    if (!jobId) return

    setJob(null)
    setError(null)

    let es: EventSource | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    const token = localStorage.getItem("seller_admin_token")

    const applyJob = (res: JobResponse) => {
      setJob(res)
      if (res.status === "complete" && res.product_id) {
        navigate(`/ai-studio/complete/${res.product_id}`, {
          replace: true,
          state: { generation: res.result?.generation, jobId },
        })
      }
      if (res.status === "failed") {
        setError(res.error ?? "Generation failed")
      }
    }

    const poll = async () => {
      try {
        const res = await apiFetch<JobResponse>(`/admin/ai/jobs/${jobId}`)
        applyJob(res)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Poll failed")
      }
    }

    const startSse = () => {
      es = new EventSource(`${MEDUSA_URL}/admin/ai/jobs/${jobId}/stream`)
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type: string
            progress?: number
            current_step?: string
            product_id?: string
            message?: string
          }
          if (data.type === "progress") {
            setJob((prev) =>
              prev
                ? {
                    ...prev,
                    progress: data.progress ?? prev.progress,
                    current_step: data.current_step ?? prev.current_step,
                    status: "running",
                  }
                : prev
            )
          }
          if (data.type === "complete" && data.product_id) {
            es?.close()
            void poll()
          }
          if (data.type === "error") {
            setError(data.message ?? "Generation failed")
            es?.close()
          }
        } catch {
          // ignore
        }
      }
      es.onerror = () => {
        es?.close()
        pollTimer = setInterval(poll, 2000)
        void poll()
      }
    }

    if (token) {
      void poll()
      pollTimer = setInterval(poll, 2000)
    } else {
      startSse()
    }

    return () => {
      es?.close()
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [jobId, navigate])

  const retry = async () => {
    if (!jobId) return
    setRetrying(true)
    setError(null)
    try {
      await apiFetch(`/admin/ai/jobs/${jobId}/retry`, { method: "POST" })
      toast.push("Retrying generation…", "info")
      setJob((prev) => (prev ? { ...prev, status: "queued", progress: 0 } : prev))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Retry failed")
    } finally {
      setRetrying(false)
    }
  }

  const status = error ? "failed" : job?.status === "queued" ? "queued" : "running"
  const progress = job?.progress ?? (status === "queued" ? 5 : 10)

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">AI Generation Status</h1>
        <p className="mt-2 text-slate-500">Monitoring your visual assets in real-time.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-brand bg-brand-light text-2xl">
              ⏳
            </div>
            <p className="font-semibold">Waiting in queue…</p>
            <p className="mt-2 text-sm text-slate-500">Your request is being prepared.</p>
            <Badge label="queued" className="mt-4" />
          </Card>
          <Card className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
              !
            </div>
            <p className="font-semibold">Generation Failed</p>
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-left text-sm text-red-700">{error}</div>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => void retry()} disabled={retrying}>
                Retry Generation
              </Button>
              <Button variant="outline">View Error Logs</Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 text-sm text-slate-500">
        Admin › AI Studio › Generation Progress
      </div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">AI Generation</h1>
        <Badge label={status === "queued" ? "queued" : "running"} />
      </div>
      <p className="mb-8 max-w-2xl text-slate-600">
        Our neural network is crafting your custom artisanal merchandise design.
      </p>

      <Card className="mb-8 text-center">
        <div className="mx-auto mb-4 text-3xl text-brand">⏳</div>
        <p className="text-xl font-semibold">Generating…</p>
        <p className="mt-1 font-mono text-xs uppercase text-slate-400">
          Current step: {job?.current_step ?? "creating design"}
        </p>
        <div className="mx-auto mt-6 max-w-md">
          <ProgressBar value={progress} />
          <p className="mt-2 text-sm font-medium text-brand">{progress}%</p>
        </div>
      </Card>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Configuration</CardTitle>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">Your Prompt</p>
            <p className="mt-1 text-slate-700">{displayPrompt}</p>
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">Merchandise category</p>
            <p className="mt-1">{displayCategory ?? "—"}</p>
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">Fulfillment base</p>
            <p className="mt-1">{displayProductName}</p>
          </div>
        </Card>
        <Card>
          <CardTitle className="mb-4">Execution Info</CardTitle>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Job ID</dt>
              <dd className="font-mono">{jobId?.slice(-12).toUpperCase()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Queue Position</dt>
              <dd>1st (Priority)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Estimated Time</dt>
              <dd>~14 seconds</dd>
            </div>
          </dl>
        </Card>
      </div>

    </div>
  )
}
