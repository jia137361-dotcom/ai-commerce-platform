import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiFetch, ApiError } from "../lib/api-client"
import { fileToBase64 } from "../lib/file-to-base64"
import { useToast } from "./ToastProvider"
import { Button } from "./ui/Button"
import { FieldError, Label } from "./ui/Input"

const IMAGE_MAX = 2 * 1024 * 1024
const BANNER_MAX = 5 * 1024 * 1024

async function uploadImage(path: string, file: File) {
  const fileBase64 = await fileToBase64(file)
  return apiFetch<{ logo_url?: string; banner_url?: string; url?: string }>(path, {
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
  onLogoChange,
  onBannerChange,
}: {
  logoUrl: string
  bannerUrl: string
  onLogoChange: (url: string) => void
  onBannerChange: (url: string) => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshSettings = async () => {
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }

  const handleUpload = async (
    file: File,
    kind: "logo" | "banner",
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
      } else {
        const res = await uploadImage("/admin/store-settings/banner", file)
        if (res.banner_url) onBannerChange(res.banner_url)
        await refreshSettings()
        toast.push("Banner uploaded successfully", "success")
      }
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed"
      setError(message)
      toast.push(message, "error")
    } finally {
      setUploading(false)
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

      <div className="sm:col-span-2">
        <FieldError message={error} />
      </div>
    </>
  )
}
