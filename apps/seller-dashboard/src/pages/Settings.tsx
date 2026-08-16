import { FormEvent, useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  buildStorePolicyTexts,
  mergeStorePolicyPresets,
  type StorePolicyPresetFields,
} from "@ai-commerce/shared-types"
import { apiFetch } from "../lib/api-client"
import { PageHeader } from "../components/PageHeader"
import { StorePolicyPresetsSection } from "../components/StorePolicyPresetsSection"
import { StoreSettingsMediaFields } from "../components/StoreSettingsMediaFields"
import { SellerStripeConnectSection } from "../components/SellerStripeConnectSection"
import { PlatformPayPalBusinessSection } from "../components/PlatformPayPalBusinessSection"
import { useToast } from "../components/ToastProvider"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { Input, Label, Select } from "../components/ui/Input"
import type { StoreSettings } from "@ai-commerce/shared-types"

export function SettingsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<{ settings: StoreSettings }>("/admin/store-settings"),
  })

  const [brandName, setBrandName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [supportEmail, setSupportEmail] = useState("")
  const [currency, setCurrency] = useState("usd")
  const [language, setLanguage] = useState("en")
  const [description, setDescription] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const [bannerUrl, setBannerUrl] = useState("")
  const [policyPresets, setPolicyPresets] = useState<StorePolicyPresetFields>({})

  useEffect(() => {
    const s = data?.settings
    if (!s) return
    setBrandName(s.brand_name ?? "")
    setLogoUrl(s.logo_url ?? "")
    setSupportEmail(s.support_email ?? "")
    setCurrency(String(s.metadata?.currency ?? "usd"))
    setLanguage(String(s.metadata?.language ?? "en"))
    setDescription(String(s.metadata?.description ?? s.seo_description ?? ""))
    setAnnouncement(String(s.metadata?.announcement ?? ""))
    setBannerUrl(String(s.metadata?.banner_url ?? ""))
    setPolicyPresets(mergeStorePolicyPresets(s.metadata))
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () => {
      const mergedPresets = mergeStorePolicyPresets({ ...data?.settings.metadata, policy_presets: policyPresets })
      const generatedPolicies = buildStorePolicyTexts(mergedPresets, brandName)
      const previousMetadata = { ...(data?.settings.metadata ?? {}) }
      delete previousMetadata.gallery_urls

      return apiFetch("/admin/store-settings", {
        method: "PUT",
        body: JSON.stringify({
          brand_name: brandName,
          logo_url: logoUrl,
          support_email: supportEmail,
          seo_description: description || null,
          metadata: {
            ...previousMetadata,
            currency,
            language,
            description,
            announcement,
            banner_url: bannerUrl || null,
            policy_presets: mergedPresets,
            ...generatedPolicies,
            faqs: null,
          },
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast.push("Settings saved successfully", "success")
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Failed to save settings", "error")
    },
  })

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
            <StoreSettingsMediaFields
              logoUrl={logoUrl}
              bannerUrl={bannerUrl}
              onLogoChange={setLogoUrl}
              onBannerChange={setBannerUrl}
            />

            <Label>Store Name</Label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />

            <Label>Support Email</Label>
            <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />

            <Label>About / Description</Label>
            <textarea className="min-h-28 rounded-lg border border-slate-300 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell buyers about your store" />

            <Label>Announcement</Label>
            <Input value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="New collection now available" />

            <StorePolicyPresetsSection
              presets={policyPresets}
              brandName={brandName}
              onChange={setPolicyPresets}
            />

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
      <SellerStripeConnectSection />
      <PlatformPayPalBusinessSection />
    </div>
  )
}
