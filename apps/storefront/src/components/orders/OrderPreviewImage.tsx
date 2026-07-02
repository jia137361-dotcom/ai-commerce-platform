import { useEffect, useState } from "react"
import { fetchProductDetail, getAiWorkerPublicBase } from "../../lib/buyer-api"
import { resolveStoreAssetUrl } from "../../lib/store-media-url"

const backendBase =
  (import.meta.env.VITE_MEDUSA_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:9000"

const resolveImageUrl = (url?: string | null) =>
  url ? resolveStoreAssetUrl(url, backendBase, getAiWorkerPublicBase()) ?? url : null

export function OrderPreviewImage({
  thumbnail,
  productId,
  title,
}: {
  thumbnail?: string | null
  productId?: string | null
  title: string
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setFailed(false)

    const load = async () => {
      const resolvedThumbnail = resolveImageUrl(thumbnail)
      if (resolvedThumbnail) {
        setImageUrl(resolvedThumbnail)
        return
      }
      if (!productId) {
        setImageUrl(null)
        return
      }
      try {
        const result = await fetchProductDetail(productId)
        if (!active) return
        const fallback = resolveImageUrl(result.data.imageUrl || result.data.mockupImageUrl)
        setImageUrl(fallback)
      } catch {
        if (active) setImageUrl(null)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [thumbnail, productId])

  useEffect(() => {
    if (!failed || !productId || imageUrl) return
    let active = true
    void fetchProductDetail(productId)
      .then((result) => {
        if (!active) return
        const fallback = resolveImageUrl(result.data.imageUrl || result.data.mockupImageUrl)
        if (fallback) setImageUrl(fallback)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [failed, imageUrl, productId])

  if (!imageUrl) {
    return <span>No image</span>
  }

  return (
    <img
      src={imageUrl}
      alt={title}
      onError={() => {
        setFailed(true)
        setImageUrl(null)
      }}
    />
  )
}
