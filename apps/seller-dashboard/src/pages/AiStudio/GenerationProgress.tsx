import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { ApiError, apiFetch, MEDUSA_URL } from "../../lib/api-client"
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
  styledPrompt?: string
  styleLabel?: string
  productName?: string
  marketplaceCategory?: string
}

type JobAccessIssue = "store_mismatch" | "not_found" | null

const STORE_MISMATCH_MESSAGE =
  "This AI generation job belongs to another store. Please start a new generation for the current store."

const JOB_NOT_FOUND_MESSAGE = "This AI generation job could not be found. Please start a new generation."

const resolveJobAccessIssue = (error: unknown): { issue: JobAccessIssue; message: string } | null => {
  if (!(error instanceof ApiError)) {
    return null
  }

  if (
    error.code === "AI_JOB_STORE_MISMATCH" ||
    (error.code === "VALIDATION_ERROR" && /does not belong|another store|current store/i.test(error.message))
  ) {
    return { issue: "store_mismatch", message: STORE_MISMATCH_MESSAGE }
  }

  if (error.code === "AI_JOB_NOT_FOUND" || error.status === 404) {
    return { issue: "not_found", message: JOB_NOT_FOUND_MESSAGE }
  }

  return null
}

export function GenerationProgressPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [job, setJob] = useState<JobResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jobAccessIssue, setJobAccessIssue] = useState<JobAccessIssue>(null)
  const [retrying, setRetrying] = useState(false)
  const [showErrorLogs, setShowErrorLogs] = useState(false)
  const [aiWorkerMock, setAiWorkerMock] = useState<{ active: boolean; reason?: string } | null>(
    null
  )
  const state = (location.state ?? {}) as ProgressLocationState
  const displayPrompt = job?.prompt ?? state.styledPrompt ?? state.prompt ?? "—"
  const displayProductName = state.productName ?? "White T-shirt"
  const displayCategory = state.marketplaceCategory
  const displayStyle = state.styleLabel

  useEffect(() => {
    void fetch("http://127.0.0.1:8001/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { mock_generation?: boolean; mock_mode_reason?: string } | null) => {
        if (!data) return
        setAiWorkerMock({
          active: Boolean(data.mock_generation),
          reason: data.mock_mode_reason || undefined,
        })
      })
      .catch(() => {
        setAiWorkerMock(null)
      })
  }, [])

  useEffect(() => {
    if (!jobId) return

    setJob(null)
    setError(null)
    setJobAccessIssue(null)

    let es: EventSource | null = null
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let stopped = false
    const token = localStorage.getItem("seller_admin_token")

    const stopPolling = () => {
      stopped = true
      es?.close()
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    }

    const handleJobAccessError = (err: unknown) => {
      const accessIssue = resolveJobAccessIssue(err)
      if (!accessIssue) {
        return false
      }

      stopPolling()
      setJob(null)
      setJobAccessIssue(accessIssue.issue)
      setError(accessIssue.message)
      return true
    }

    const applyJob = (res: JobResponse) => {
      if (stopped) return
      setJob(res)
      if (res.status === "complete" && res.product_id) {
        navigate(`/products/${res.product_id}/edit?review=ai`, {
          replace: true,
          state: {
            generation: res.result?.generation,
            jobId,
            aiReview: true,
          },
        })
      }
      if (res.status === "failed") {
        setError(res.error ?? "Generation failed")
      }
    }

    const poll = async () => {
      if (stopped) return
      try {
        const res = await apiFetch<JobResponse>(`/admin/ai/jobs/${jobId}`)
        applyJob(res)
      } catch (err: unknown) {
        if (handleJobAccessError(err)) return
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
      stopPolling()
    }
  }, [jobId, navigate])

  const retry = async () => {
    if (!jobId) return
    setRetrying(true)
    setError(null)
    setJobAccessIssue(null)
    try {
      await apiFetch(`/admin/ai/jobs/${jobId}/retry`, { method: "POST" })
      toast.push("Retrying generation…", "info")
      setJob((prev) => (prev ? { ...prev, status: "queued", progress: 0 } : prev))
    } catch (err: unknown) {
      const accessIssue = resolveJobAccessIssue(err)
      if (accessIssue) {
        setJob(null)
        setJobAccessIssue(accessIssue.issue)
        setError(accessIssue.message)
        return
      }
      setError(err instanceof Error ? err.message : "Retry failed")
    } finally {
      setRetrying(false)
    }
  }

  const status = error ? "failed" : job?.status === "queued" ? "queued" : "running"
  const progress = job?.progress ?? (status === "queued" ? 5 : 10)
  const estimatedLabel =
    job?.estimated_seconds != null
      ? `~${Math.max(1, Math.round(job.estimated_seconds))} seconds`
      : status === "queued"
        ? "Waiting in queue"
        : "In progress"

  if (error) {
    const isAccessIssue = Boolean(jobAccessIssue)

    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">AI Generation Status</h1>
        <p className="mt-2 text-slate-500">
          {isAccessIssue
            ? "This generation cannot continue from the current seller store."
            : "Monitoring your visual assets in real-time."}
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {!isAccessIssue ? (
            <Card className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-brand bg-brand-light text-2xl">
                ⏳
              </div>
              <p className="font-semibold">Waiting in queue…</p>
              <p className="mt-2 text-sm text-slate-500">Your request is being prepared.</p>
              <Badge label="queued" className="mt-4" />
            </Card>
          ) : null}
          <Card className={isAccessIssue ? "text-center md:col-span-2" : "text-center"}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-brand bg-brand-light text-2xl">
              !
            </div>
            <p className="font-semibold">
              {isAccessIssue ? "Start a New Generation" : "Generation Failed"}
            </p>
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-left text-sm text-red-700">{error}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {!isAccessIssue ? (
                <Button onClick={() => void retry()} disabled={retrying}>
                  Retry Generation
                </Button>
              ) : null}
              <Button type="button" onClick={() => navigate("/ai-studio/create")}>
                Start New Generation
              </Button>
              <Button variant="outline" type="button" onClick={() => navigate("/ai-studio/create")}>
                Create Manual Draft
              </Button>
              <Button variant="outline" type="button" onClick={() => setShowErrorLogs(true)}>
                View Error Logs
              </Button>
            </div>
            {showErrorLogs ? (
              <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-left text-xs text-slate-100">
                {job?.error ?? error}
              </pre>
            ) : null}
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

      {aiWorkerMock?.active ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">真实 AI 生图当前已跳过</p>
          <p className="mt-1">
            {aiWorkerMock.reason === "DASHSCOPE_API_KEY is not set"
              ? "请在 apps/medusa-backend/.env 配置 DASHSCOPE_API_KEY，并重启 npm run dev:full。"
              : aiWorkerMock.reason
                ? `原因：${aiWorkerMock.reason}`
                : "AI Worker 处于 mock 模式，将使用本地占位图而非 DashScope 生图。"}
          </p>
        </div>
      ) : null}

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
            <p className="text-xs font-semibold uppercase text-slate-400">Style preset</p>
            <p className="mt-1">{displayStyle ?? "—"}</p>
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
              <dd>{estimatedLabel}</dd>
            </div>
          </dl>
        </Card>
      </div>

    </div>
  )
}
