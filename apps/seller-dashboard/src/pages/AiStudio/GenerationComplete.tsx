import { FormEvent, useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import { storeProductPath } from "../../lib/store-product-api"
import { buildProductGallery } from "../../lib/product-gallery"
import { extractDominantColors } from "../../lib/extract-colors"
import { useToast } from "../../components/ToastProvider"
import { Button } from "../../components/ui/Button"
import { Card, CardTitle } from "../../components/ui/Card"
import { Input, Label, Textarea } from "../../components/ui/Input"
import { Skeleton } from "../../components/ui/EmptyState"
import type { NormalizedProduct } from "@ai-commerce/shared-types"

type LocationState = {
  generation?: Record<string, unknown>
  jobId?: string
}

export function GenerationCompletePage() {
  const { productId } = useParams<{ productId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const state = (location.state ?? {}) as LocationState

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", productId],
    enabled: Boolean(productId),
    queryFn: () => apiFetch<{ product: NormalizedProduct }>(storeProductPath(productId!)),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  })

  const { data: jobData } = useQuery({
    queryKey: ["ai-job", state.jobId],
    enabled: Boolean(state.jobId) && isError,
    queryFn: () =>
      apiFetch<{
        result?: { generation?: Record<string, unknown>; product?: NormalizedProduct }
      }>(`/admin/ai/jobs/${state.jobId}`),
    retry: false,
  })

  const generation =
    state.generation ??
    jobData?.result?.generation ??
    (jobData?.result?.product as Record<string, string> | undefined)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [colors, setColors] = useState<string[]>([])
  const [mockupKey, setMockupKey] = useState("mockup_front")

  const product = data?.product ?? (jobData?.result?.product as NormalizedProduct | undefined)
  const cacheKey =
    product?.ai_job_id ??
    (typeof state.jobId === "string" ? state.jobId : null) ??
    (typeof generation?.ai_job_id === "string" ? generation.ai_job_id : null)
  const { mockups, diyAssets } = buildProductGallery(product, generation, {
    cacheKey,
    preferProduct: Boolean(product?.metadata?.gallery),
  })
  const activeMockup =
    mockups.find((item) => item.id === mockupKey)?.url ?? mockups[0]?.url
  const designUrl = diyAssets.find((item) => item.id === "design")?.url

  useEffect(() => {
    if (product) {
      setTitle(product.title ?? "")
      setDescription(product.description ?? "")
      setPrice(String(product.price ?? ""))
      const metaTags = product.metadata?.tags
      setTags(Array.isArray(metaTags) ? (metaTags as string[]) : product.tags ?? [])
    } else if (generation) {
      if (typeof generation.title === "string") setTitle(generation.title)
      if (typeof generation.description === "string") setDescription(generation.description)
      if (generation.price_suggestion != null) setPrice(String(generation.price_suggestion))
      if (Array.isArray(generation.tags)) {
        setTags(generation.tags.filter((t): t is string => typeof t === "string"))
      }
    }
  }, [product, generation])

  useEffect(() => {
    if (!mockups.some((item) => item.id === mockupKey) && mockups[0]) {
      setMockupKey(mockups[0].id)
    }
  }, [mockups, mockupKey])

  useEffect(() => {
    if (designUrl) {
      void extractDominantColors(designUrl).then(setColors)
    }
  }, [designUrl])

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch(storeProductPath(productId!), {
        method: "PUT",
        body: JSON.stringify({
          title,
          description,
          price: Number(price),
          tags,
          metadata: product?.metadata ?? {},
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] })
      toast.push("Draft saved", "success")
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-square" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600">
            <span>✓</span>
            <h1 className="text-3xl font-bold text-slate-900">AI Generation Complete</h1>
          </div>
          <p className="mt-2 text-slate-500">
            Your design is composited onto the fulfillment blank. Mockup views show the T-shirt;
            Print Artwork is the flat graphic only.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/ai-studio/create">
            <Button variant="outline">Regenerate</Button>
          </Link>
          <Button onClick={() => saveMutation.mutate()}>Save Draft</Button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <p className="border-b px-4 py-2 text-xs font-semibold uppercase text-slate-500">
              T-shirt Mockup Preview
            </p>
            {activeMockup ? (
              <img src={activeMockup} alt="Mockup preview" className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-slate-100">No mockup</div>
            )}
            {mockups.length ? (
              <div className="flex flex-wrap gap-2 border-t p-3">
                {mockups.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMockupKey(item.id)}
                    className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${
                      mockupKey === item.id ? "border-brand" : "border-slate-200"
                    }`}
                  >
                    <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </Card>

          <Card>
            <CardTitle className="mb-3 text-xs uppercase tracking-wide text-slate-500">
              Production Files
            </CardTitle>
            <p className="mb-3 text-sm text-slate-500">
              Print Artwork is the isolated graphic sent to print. Print File adds supplier margins.
            </p>
            {diyAssets.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {diyAssets.map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border border-slate-200"
                  >
                    <img src={asset.url} alt={asset.label} className="aspect-square w-full object-cover" />
                    <p className="border-t px-3 py-2 text-sm font-medium">{asset.label}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No design files generated.</p>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-3 text-xs uppercase tracking-wide text-slate-500">
              Extracted Color Palette
            </CardTitle>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((color) => (
                <div
                  key={color}
                  className="aspect-square rounded-lg border"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </Card>
        </div>

        <Card className="space-y-5">
          <CardTitle>Product Details</CardTitle>
          <div>
            <Label>Title</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Tags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div>
            <Label>AI Suggested Price</Label>
            <p className="mt-1 text-3xl font-bold">${price || "29.99"}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" variant="outline">
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={() =>
                navigate(`/products/${productId}/edit`, {
                  state: {
                    product: {
                      ...(product ??
                        (jobData?.result?.product as NormalizedProduct | undefined)),
                      title,
                      description,
                      price: Number(price) || undefined,
                      tags,
                    },
                    generation,
                  },
                })
              }
            >
              Edit & Publish →
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
