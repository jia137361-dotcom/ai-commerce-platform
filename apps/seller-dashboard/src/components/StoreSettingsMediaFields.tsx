import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiFetch, ApiError } from "../lib/api-client"
import { fileToBase64 } from "../lib/file-to-base64"
import { useToast } from "./ToastProvider"
import { Button } from "./ui/Button"
import { FieldError, Label } from "./ui/Input"

const IMAGE_MAX = 2 * 1024 * 1024
const BANNER_MAX = 5 * 1024 * 1024
const GALLERY_MAX = 12

async function uploadImage(path: string, file: File) {
  const fileBase64 = await fileToBase64(file)
  return apiFetch<{ logo_url?: string; banner_url?: string; url?: string; gallery_urls?: string[] }>(path, {
    method: "POST",
    body: JSON.stringify({
      file_base64: fileBase64,
      content_type: file.type || "image/png",
    }),
  })
}

function validateImage(file: File, maxBytes: number) {
  if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
    return "Only PNG and JPG files are supported"
  }
  if (file.size > maxBytes) {
    return `Image must be ${Math.round(maxBytes / (1024 * 1024))}MB or smaller`
  }
  return null
}

export function StoreSettingsMediaFields({
  logoUrl,
  bannerUrl,
  galleryUrls,
  onLogoChange,
  onBannerChange,
  onGalleryChange,
}: {
  logoUrl: string
  bannerUrl: string
  galleryUrls: string[]
  onLogoChange: (url: string) => void
  onBannerChange: (url: string) => void
  onGalleryChange: (urls: string[]) => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLegacyLogoGallery = galleryUrls.some((url) => url.includes("/static/logos/"))

  const refreshSettings = async () => {
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  const handleUpload = async (
    file: File,
    kind: "logo" | "banner" | "gallery",
    setUploading: (value: boolean) => void
  ) => {
    setError(null)
    const maxBytes = kind === "banner" ? BANNER_MAX : IMAGE_MAX
    const validation = validateImage(file, maxBytes)
    if (validation) {
      setError(validation)
      return
    }

    setUploading(true)
    try {
      if (kind === "logo") {
        const res = await uploadImage("/admin/store-settings/logo", file)
        if (res.logo_url) onLogoChange(res.logo_url)
        await refreshSettings()
        toast.push("Logo uploaded successfully", "success")
      } else if (kind === "banner") {
        const res = await uploadImage("/admin/store-settings/banner", file)
        if (res.banner_url) onBannerChange(res.banner_url)
        await refreshSettings()
        toast.push("Banner uploaded successfully", "success")
      } else {
        if (galleryUrls.length >= GALLERY_MAX) {
          setError(`Gallery supports up to ${GALLERY_MAX} images`)
          return
        }
        const res = await uploadImage("/admin/store-settings/gallery", file)
        onGalleryChange(res.gallery_urls ?? (res.url ? [...galleryUrls, res.url] : galleryUrls))
        await refreshSettings()
        toast.push("Gallery image added", "success")
      }
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed"
      setError(message)
      toast.push(message, "error")
    } finally {
      setUploading(false)
    }
  }

  const removeGalleryImage = async (url: string) => {
    setError(null)
    try {
      const res = await apiFetch<{ gallery_urls?: string[] }>("/admin/store-settings/gallery", {
        method: "DELETE",
        body: JSON.stringify({ url }),
      })
      onGalleryChange(res.gallery_urls ?? galleryUrls.filter((entry) => entry !== url))
      await refreshSettings()
      toast.push("Gallery image removed", "success")
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Unable to remove image"
      setError(message)
      toast.push(message, "error")
    }
  }

  return (
    <>
      <Label>Logo</Label>
      <div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
            {logoUrl ? (
              <img src={logoUrl} alt="Store logo" className="h-full w-full rounded-lg object-cover" />
            ) : (
              <span className="text-xs text-slate-400">1024×1024</span>
            )}
          </div>
          <div>
            <input
              ref={logoRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              disabled={logoUploading}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleUpload(file, "logo", setLogoUploading)
                if (logoRef.current) logoRef.current.value = ""
              }}
            />
            <Button type="button" variant="outline" disabled={logoUploading} onClick={() => logoRef.current?.click()}>
              {logoUploading ? "Uploading…" : "Upload logo"}
            </Button>
            <p className="mt-2 text-xs text-slate-500">PNG or JPG, up to 2MB. Recommended 1:1 ratio.</p>
          </div>
        </div>
      </div>

      <Label>Store banner</Label>
      <div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {bannerUrl ? (
            <img src={bannerUrl} alt="Store banner preview" className="h-36 w-full object-cover" />
          ) : (
            <div className="flex h-36 items-center justify-center text-sm text-slate-400">1600×600 recommended</div>
          )}
        </div>
        <div className="mt-3">
          <input
            ref={bannerRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            disabled={bannerUploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleUpload(file, "banner", setBannerUploading)
              if (bannerRef.current) bannerRef.current.value = ""
            }}
          />
          <Button type="button" variant="outline" disabled={bannerUploading} onClick={() => bannerRef.current?.click()}>
            {bannerUploading ? "Uploading…" : bannerUrl ? "Replace banner" : "Upload banner"}
          </Button>
          <p className="mt-2 text-xs text-slate-500">Shown at the top of your buyer storefront. PNG or JPG, up to 5MB.</p>
        </div>
      </div>

      <Label>Shop gallery</Label>
      <div className="space-y-3">
        {hasLegacyLogoGallery ? (
          <p className="text-sm text-amber-700">
            Current gallery entries use logo file paths. Remove them and upload dedicated shop photos so buyers can browse multiple images.
          </p>
        ) : null}
        {galleryUrls.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {galleryUrls.map((url, index) => (
              <figure key={`${url}-${index}`} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
                <figcaption className="p-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => void removeGalleryImage(url)}>
                    Remove
                  </Button>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Add photos for the About → Inside the shop gallery. Buyers can swipe through them.</p>
        )}
        <div>
          <input
            ref={galleryRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            disabled={galleryUploading || galleryUrls.length >= GALLERY_MAX}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              void (async () => {
                let nextUrls = galleryUrls
                for (const file of files) {
                  if (nextUrls.length >= GALLERY_MAX) break
                  setGalleryUploading(true)
                  setError(null)
                  const validation = validateImage(file, IMAGE_MAX)
                  if (validation) {
                    setError(validation)
                    continue
                  }
                  try {
                    const res = await uploadImage("/admin/store-settings/gallery", file)
                    nextUrls = res.gallery_urls ?? (res.url ? [...nextUrls, res.url] : nextUrls)
                    onGalleryChange(nextUrls)
                  } catch (err: unknown) {
                    const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed"
                    setError(message)
                    toast.push(message, "error")
                    break
                  }
                }
                if (files.length) {
                  await refreshSettings()
                  toast.push("Gallery updated", "success")
                }
                setGalleryUploading(false)
              })()
              if (galleryRef.current) galleryRef.current.value = ""
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={galleryUploading || galleryUrls.length >= GALLERY_MAX}
            onClick={() => galleryRef.current?.click()}
          >
            {galleryUploading ? "Uploading…" : "Add gallery images"}
          </Button>
          <p className="mt-2 text-xs text-slate-500">
            Up to {GALLERY_MAX} images. PNG or JPG, 2MB each. Multiple files can be selected at once.
          </p>
        </div>
      </div>

      <div className="sm:col-span-2">
        <FieldError message={error} />
      </div>
    </>
  )
}
