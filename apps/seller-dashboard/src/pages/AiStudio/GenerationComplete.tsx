import { useEffect } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Skeleton } from "../../components/ui/EmptyState"

type LocationState = {
  generation?: Record<string, unknown>
  jobId?: string
  aiReview?: boolean
}

/** Legacy route — redirects to unified AI review on Edit Draft. */
export function GenerationCompletePage() {
  const { productId } = useParams<{ productId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state ?? {}) as LocationState

  useEffect(() => {
    if (!productId) return
    navigate(`/products/${productId}/edit?review=ai`, {
      replace: true,
      state: {
        generation: state.generation,
        jobId: state.jobId,
        aiReview: true,
      },
    })
  }, [navigate, productId, state.generation, state.jobId])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="aspect-square" />
      <Skeleton className="h-96" />
    </div>
  )
}
