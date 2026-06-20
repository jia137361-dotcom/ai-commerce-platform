import { FormEvent, useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, ApiError } from "../lib/api-client"
import { fileToBase64 } from "../lib/file-to-base64"
import { PageHeader } from "../components/PageHeader"
import { useToast } from "../components/ToastProvider"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { FieldError, Input, Label, Select } from "../components/ui/Input"
import type { StoreSettings } from "@ai-commerce/shared-types"

const LOGO_MAX = 2 * 1024 * 1024

export function SettingsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<{ settings: StoreSettings }>("/admin/store-settings"),
  })

  const [brandName, setBrandName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [supportEmail, setSupportEmail] = useState("")
  const [currency, setCurrency] = useState("usd")
  const [language, setLanguage] = useState("en")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    const s = data?.settings
    if (!s) return
    setBrandName(s.brand_name ?? "")
    setLogoUrl(s.logo_url ?? "")
    setSupportEmail(s.support_email ?? "")
    setCurrency(String(s.metadata?.currency ?? "usd"))
    setLanguage(String(s.metadata?.language ?? "en"))
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("/admin/store-settings", {
        method: "PUT",
        body: JSON.stringify({
          brand_name: brandName,
          logo_url: logoUrl,
          support_email: supportEmail,
          metadata: { currency, language },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast.push("Settings saved successfully", "success")
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Failed to save settings", "error")
    },
  })

  const uploadLogo = async (file: File) => {
    setUploadError(null)
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setUploadError("Only PNG and JPG files are supported")
      return
    }
    if (file.size > LOGO_MAX) {
      setUploadError("Logo must be 2MB or smaller")
      return
    }
    if (file.size > 500 * 1024) {
      toast.push("Large logo detected — upload may take a moment", "info")
    }

    setUploading(true)
    try {
      const fileBase64 = await fileToBase64(file)
      const res = await apiFetch<{ logo_url: string }>("/admin/store-settings/logo", {
        method: "POST",
        body: JSON.stringify({
          file_base64: fileBase64,
          content_type: file.type || "image/png",
        }),
      })
      setLogoUrl(res.logo_url)
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast.push("Logo uploaded successfully", "success")
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Logo upload failed"
      setUploadError(message)
      toast.push(message, "error")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        title="Store Settings"
        description="Manage your boutique's global identity and operational preferences."
      />
      <Card className="mx-auto max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-[140px_1fr] sm:items-center">
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
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void uploadLogo(file)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? "Uploading…" : "Upload New Logo"}
                  </Button>
                  <p className="mt-2 text-xs text-slate-500">
                    Supports PNG, JPG. Max size 2MB. Recommended 1:1 aspect ratio.
                  </p>
                  <FieldError message={uploadError} />
                </div>
              </div>
            </div>

            <Label>Store Name</Label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />

            <Label>Support Email</Label>
            <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />

            <Label>Currency</Label>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="usd">USD - US Dollar</option>
              <option value="eur">EUR - Euro</option>
              <option value="gbp">GBP - British Pound</option>
            </Select>

            <Label>Language</Label>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </Select>
          </div>

          <div className="flex justify-center pt-2">
            <Button type="submit" size="lg" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save Settings ✨"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
