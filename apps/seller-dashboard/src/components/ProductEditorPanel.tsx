import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { apiFetch, ApiError } from "../lib/api-client"
import { storeProductPath } from "../lib/store-product-api"
import type { ProductGalleryItem } from "../lib/product-gallery"
import { downloadImageAsJpg } from "../lib/download-image"
import { cn } from "../lib/cn"
import { Skeleton } from "./ui/EmptyState"

type DesignConfigResponse = {
  sdk_base_url: string
  token: string
  basic_product_id: string
  s2b_product_id?: string | null
  size_id?: string | null
  color_id?: string | null
  view_id?: string | null
  material_id?: string | null
  design_type?: number
  editor_mode?: "new" | "redesign"
  redesign_mode?: boolean
  designer_url?: string
  assets_refreshed?: boolean
}

type SyncS2bDesignResponse = {
  supplier_product_id: string | null
  mockup_image_url: string | null
  gallery: ProductGalleryItem[]
}

const S2BDIY_ORIGINS = ["https://opensdk.s2bdiy.com", "https://opensdktest.s2bdiy.com"]

const CREDENTIAL_ERROR_CODES = new Set([
  "S2BDIY_CREDENTIALS_REQUIRED",
  "S2BDIY_CREDENTIALS_INVALID",
  "SUPPLIER_AUTH_FAILED",
])

const buildDesignerUrl = (config: DesignConfigResponse) => {
  if (config.designer_url) return config.designer_url
  const base = config.sdk_base_url.replace(/\/$/, "")
  const params = new URLSearchParams({ token: config.token })
  if (config.editor_mode === "redesign" && config.s2b_product_id) {
    params.set("productId", config.s2b_product_id)
  } else {
    params.set("basicProductId", config.basic_product_id)
    if (config.size_id) params.set("sizeId", config.size_id)
    if (config.color_id) params.set("colorId", config.color_id)
    if (config.view_id) params.set("viewId", config.view_id)
    if (config.material_id) params.set("materialId", config.material_id)
    if (config.design_type) params.set("designType", String(config.design_type))
  }
  return `${base}/singleDesign?${params.toString()}`
}

const toMockupItems = (items: ProductGalleryItem[]) => items.filter((item) => item.kind === "mockup")

const readImageUrl = (value: unknown): string | null => {
  if (typeof value === "string" && /^https?:\/\//.test(value.trim())) return value.trim()
  if (value && typeof value === "object" && typeof (value as Record<string, unknown>).src === "string") {
    const src = (value as Record<string, unknown>).src as string
    return /^https?:\/\//.test(src.trim()) ? src.trim() : null
  }
  return null
}

const extractMockupUrlsFromMessage = (data: Record<string, unknown>): string[] => {
  const urls: string[] = []
  const push = (value: unknown) => {
    const url = readImageUrl(value)
    if (url && !urls.includes(url)) urls.push(url)
  }

  push(data.mockup_url)
  push(data.mockupUrl)
  push(data.preview_url)
  push(data.previewUrl)

  if (Array.isArray(data.mockup_urls)) data.mockup_urls.forEach(push)
  if (Array.isArray(data.mockupUrls)) data.mockupUrls.forEach(push)

  const showImages = data.show_images ?? data.showImages
  if (Array.isArray(showImages)) {
    for (const block of showImages) {
      if (!block || typeof block !== "object") continue
      const images = (block as Record<string, unknown>).images
      if (Array.isArray(images)) images.forEach(push)
      else push(block)
    }
  }

  return urls
}

const mockupsFromUrls = (urls: string[]): ProductGalleryItem[] =>
  urls.map((url, index) => ({
    id: index === 0 ? "mockup_front" : `mockup_${index + 1}`,
    label: index === 0 ? "Front" : `View ${index + 1}`,
    url,
    kind: "mockup" as const,
  }))

function MockupPreviewStrip({
  mockups,
  title = "商品预览",
  badge,
  compact = false,
}: {
  mockups: ProductGalleryItem[]
  title?: string
  badge?: string
  compact?: boolean
}) {
  const [activeId, setActiveId] = useState(mockups[0]?.id ?? "mockup_front")
  const activeMockup = mockups.find((item) => item.id === activeId) ?? mockups[0]

  useEffect(() => {
    if (!mockups.some((item) => item.id === activeId)) {
      setActiveId(mockups[0]?.id ?? "mockup_front")
    }
  }, [activeId, mockups])

  if (!mockups.length) return null

  return (
    <div className="border-t border-slate-200 bg-slate-50">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        {badge ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 px-4 py-3">
        {mockups.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Show ${item.label}`}
            aria-pressed={activeId === item.id}
            onClick={() => setActiveId(item.id)}
            className="text-center"
          >
            <div
              className={`overflow-hidden rounded-lg border-2 transition ${
                compact ? "h-12 w-12" : "h-14 w-14"
              } ${
                activeId === item.id
                  ? "border-brand ring-2 ring-brand/30"
                  : "border-slate-200 hover:border-brand/50"
              }`}
            >
              <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{item.label}</p>
          </button>
        ))}
      </div>
      {activeMockup ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <img
            key={activeMockup.url}
            src={activeMockup.url}
            alt={activeMockup.label}
            className={cn(
              "mx-auto w-full max-w-xl object-contain",
              compact ? "max-h-[220px]" : "max-h-[320px]"
            )}
          />
          <p className="mt-2 text-center text-xs text-slate-400">
            此预览将同步为商品主图与发布后的买家端展示图
          </p>
        </div>
      ) : null}
    </div>
  )
}

function EditorToolbar({
  isFullscreen,
  syncingPreview,
  editorMode,
  onToggleFullscreen,
  onSyncPreview,
  canSync,
}: {
  isFullscreen: boolean
  syncingPreview: boolean
  editorMode?: "new" | "redesign"
  onToggleFullscreen: () => void
  onSyncPreview: () => void
  canSync: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">S2BDIY 设计器</p>
        <p className="text-[11px] text-slate-400">
          {editorMode === "redesign" ? "二次编辑已保存设计" : "加载 AI 印花与商品底图"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canSync || syncingPreview}
          onClick={onSyncPreview}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncingPreview ? "同步中…" : "同步预览"}
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? "退出全屏" : "全屏编辑"}
        </button>
      </div>
    </div>
  )
}

type LocalMockupEditorProps = {
  mockups: ProductGalleryItem[]
  diyAssets: ProductGalleryItem[]
  aiMockMode?: boolean
  aiMockModeReason?: string | null
}

function AssetDownloadButton({
  label,
  url,
  filenameBase,
}: {
  label: string
  url: string
  filenameBase: string
}) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <button
        type="button"
        disabled={downloading}
        onClick={() => {
          setDownloading(true)
          setError(null)
          void downloadImageAsJpg(url, filenameBase)
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : "Download failed")
            })
            .finally(() => setDownloading(false))
        }}
        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-60"
      >
        {downloading ? "下载中…" : label}
      </button>
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  )
}

function LocalMockupEditor({ mockups, diyAssets, aiMockMode, aiMockModeReason }: LocalMockupEditorProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState(mockups[0]?.id ?? "mockup_front")
  const [showS2bHint, setShowS2bHint] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const activeMockup = mockups.find((item) => item.id === activeId) ?? mockups[0]
  const designAsset = diyAssets.find((item) => item.id === "design")
  const printAsset = diyAssets.find((item) => item.id === "print_file")
  const showSeparatePrintFile =
    printAsset && designAsset && printAsset.url !== designAsset.url

  useEffect(() => {
    if (!mockups.some((item) => item.id === activeId)) {
      setActiveId(mockups[0]?.id ?? "mockup_front")
    }
  }, [activeId, mockups])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current)
    }
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    const el = shellRef.current
    if (!el) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    void el.requestFullscreen?.()
  }

  if (!mockups.length) {
    return (
      <div className="flex h-[min(78vh,920px)] items-center justify-center rounded-lg bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-500">No mockup views available yet. Publish a product with mockup assets from the supplier catalog.</p>
      </div>
    )
  }

  return (
    <div
      ref={shellRef}
      className={cn(
        "flex min-h-[560px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-900 lg:flex-row",
        isFullscreen ? "fixed inset-0 z-50 h-screen min-h-0 rounded-none" : "h-[min(78vh,920px)]"
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-slate-700 bg-slate-800 px-3 py-2">
          <div className="flex items-center gap-1">
            {mockups.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeId === item.id
                    ? "bg-brand text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
              本地预览
            </span>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-md border border-slate-600 px-2.5 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-700"
            >
              {isFullscreen ? "退出全屏" : "全屏"}
            </button>
          </div>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 p-4">
          {activeMockup ? (
            <img
              key={activeMockup.url}
              src={activeMockup.url}
              alt={activeMockup.label}
              className="max-h-full max-w-full object-contain drop-shadow-2xl"
            />
          ) : null}
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col border-t border-slate-700 bg-slate-800 lg:w-72 lg:border-l lg:border-t-0">
        <div className="border-b border-slate-700 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Print Artwork</p>
          {aiMockMode ? (
            <p className="mt-1 text-xs text-amber-300">
              真实 AI 生图已跳过
              {aiMockModeReason ? `（${aiMockModeReason}）` : ""} · 当前为本地占位图
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">AI 生成的印花素材</p>
          )}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {designAsset ? (
            <div className="overflow-hidden rounded-lg border border-slate-600 bg-slate-900">
              <img
                src={designAsset.url}
                alt="Print artwork"
                className="aspect-square w-full object-contain bg-white"
              />
            </div>
          ) : null}
          {designAsset ? (
            <AssetDownloadButton
              label="下载印花素材 (JPG)"
              url={designAsset.url}
              filenameBase={designAsset.label || "print-artwork"}
            />
          ) : null}
          {showSeparatePrintFile && printAsset ? (
            <AssetDownloadButton
              label="下载生产文件 (JPG)"
              url={printAsset.url}
              filenameBase={printAsset.label || "print-file"}
            />
          ) : null}
        </div>
        <div className="border-t border-slate-700 px-4 py-3">
          <p className="text-xs leading-relaxed text-slate-400">
            可在此确认 mockup 与印花效果，编辑右侧文案后直接发布。
          </p>
          <button
            type="button"
            className="mt-2 text-xs text-slate-500 underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
            onClick={() => setShowS2bHint((open) => !open)}
          >
            {showS2bHint ? "收起" : "以后如何启用 S2BDIY 在线编辑？"}
          </button>
          {showS2bHint ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              向 S2BDIY 获取 opentest 的 AppSecret，写入{" "}
              <code className="rounded bg-slate-900 px-1">apps/medusa-backend/.env</code>，运行{" "}
              <code className="rounded bg-slate-900 px-1">npm run s2bdiy:verify</code>{" "}
              通过后重启即可自动切换为在线编辑器。
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

type ProductEditorPanelProps = {
  productId: string
  mockups: ProductGalleryItem[]
  diyAssets: ProductGalleryItem[]
  aiMockMode?: boolean
  aiMockModeReason?: string | null
  className?: string
  onDesignSaved?: () => void
}

export function ProductEditorPanel({
  productId,
  mockups,
  diyAssets,
  aiMockMode,
  aiMockModeReason,
  className,
  onDesignSaved,
}: ProductEditorPanelProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [config, setConfig] = useState<DesignConfigResponse | null>(null)
  const [useLocalFallback, setUseLocalFallback] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState("Loading product editor…")
  const [iframeReady, setIframeReady] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [liveMockups, setLiveMockups] = useState<ProductGalleryItem[]>(() => toMockupItems(mockups))
  const [syncingPreview, setSyncingPreview] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [lastS2bProductId, setLastS2bProductId] = useState<string | null>(null)

  useEffect(() => {
    setLiveMockups(toMockupItems(mockups))
  }, [mockups])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current)
    }
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    const el = shellRef.current
    if (!el) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    void el.requestFullscreen?.()
  }

  const loadConfig = () => {
    setLoading(true)
    setLoadingMessage("正在向 S2BDIY 同步真实设计素材（首次可能需 10–30 秒）…")
    setConfig(null)
    setUseLocalFallback(false)
    setIframeReady(false)
    void apiFetch<DesignConfigResponse>(`${storeProductPath(productId)}/design-config`)
      .then((payload) => {
        setConfig(payload)
        if (payload.assets_refreshed) {
          setLoadingMessage("已同步真实 S2BDIY 设计素材")
          onDesignSaved?.()
        }
        if (payload.s2b_product_id) {
          setLastS2bProductId(String(payload.s2b_product_id))
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && CREDENTIAL_ERROR_CODES.has(err.code)) {
          setUseLocalFallback(true)
          return
        }
        if (mockups.length) {
          setUseLocalFallback(true)
          return
        }
        setUseLocalFallback(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const applyPreviewResult = useCallback(
    (result: SyncS2bDesignResponse) => {
      const nextMockups = toMockupItems(result.gallery)
      setLiveMockups(nextMockups)
      setLastSyncedAt(new Date().toISOString())
      if (result.supplier_product_id) {
        setLastS2bProductId(result.supplier_product_id)
        setConfig((current) =>
          current
            ? {
                ...current,
                s2b_product_id: result.supplier_product_id,
                redesign_mode: true,
              }
            : current
        )
      }
      onDesignSaved?.()
    },
    [onDesignSaved]
  )

  const syncDesignPreview = useCallback(
    async (payload: {
      s2bProductId?: string | number
      mockupUrl?: string | null
      mockupUrls?: string[]
    }) => {
      setSyncingPreview(true)
      setSyncError(null)
      const mockupUrls = [
        ...(payload.mockupUrls ?? []),
        ...(payload.mockupUrl ? [payload.mockupUrl] : []),
      ].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index)

      try {
        const result = await apiFetch<SyncS2bDesignResponse>(
          `${storeProductPath(productId)}/sync-s2b-design`,
          {
            method: "POST",
            body: JSON.stringify({
              s2b_product_id: payload.s2bProductId ?? lastS2bProductId ?? config?.s2b_product_id,
              mockup_url: mockupUrls[0],
              mockup_urls: mockupUrls.length ? mockupUrls : undefined,
            }),
          }
        )
        applyPreviewResult(result)
        return result
      } catch (err: unknown) {
        if (mockupUrls.length) {
          setLiveMockups(mockupsFromUrls(mockupUrls))
          setSyncError("预览图已更新，但写入商品数据失败，请点「同步预览」重试。")
        } else {
          const message =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Unable to sync mockup preview"
          setSyncError(message)
        }
        throw err
      } finally {
        setSyncingPreview(false)
      }
    },
    [applyPreviewResult, config?.s2b_product_id, lastS2bProductId, productId]
  )

  const handleManualSync = () => {
    void syncDesignPreview({
      s2bProductId: lastS2bProductId ?? config?.s2b_product_id ?? undefined,
    }).catch(() => undefined)
  }

  useEffect(() => {
    loadConfig()
  }, [productId])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!S2BDIY_ORIGINS.some((origin) => event.origin === origin)) return
      const data = event.data as Record<string, unknown> | undefined
      if (!data) return

      const isSavedEvent =
        data.type === "s2bdiy:product-saved" ||
        data.type === "product-saved" ||
        (data.product_id != null && data.type !== "s2bdiy:ready")

      if (!isSavedEvent) return

      const s2bProductId = data.product_id ?? data.productId
      const mockupUrls = extractMockupUrlsFromMessage(data)

      if (typeof s2bProductId === "string" || typeof s2bProductId === "number") {
        setLastS2bProductId(String(s2bProductId))
      }

      void syncDesignPreview({
        s2bProductId:
          typeof s2bProductId === "string" || typeof s2bProductId === "number"
            ? s2bProductId
            : undefined,
        mockupUrl: mockupUrls[0] ?? null,
        mockupUrls,
      }).catch(() => undefined)
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [syncDesignPreview])

  const designerUrl = useMemo(() => (config ? buildDesignerUrl(config) : ""), [config])
  const previewBadge = syncingPreview
    ? "同步中…"
    : lastSyncedAt
      ? "已对接商品预览"
      : liveMockups.length
        ? "待保存同步"
        : undefined

  if (loading) {
    return (
      <div className={className}>
        <Skeleton className="h-[min(78vh,920px)] w-full rounded-lg" />
        <p className="mt-2 text-sm text-slate-500">{loadingMessage}</p>
      </div>
    )
  }

  if (useLocalFallback || !config) {
    return (
      <div className={className}>
        <LocalMockupEditor
          mockups={liveMockups.length ? liveMockups : mockups}
          diyAssets={diyAssets}
          aiMockMode={aiMockMode}
          aiMockModeReason={aiMockModeReason}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        ref={shellRef}
        className={cn(
          "relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white",
          isFullscreen && "fixed inset-0 z-50 rounded-none border-0"
        )}
      >
        <EditorToolbar
          isFullscreen={isFullscreen}
          syncingPreview={syncingPreview}
          editorMode={config.editor_mode}
          onToggleFullscreen={toggleFullscreen}
          onSyncPreview={handleManualSync}
          canSync={Boolean(lastS2bProductId ?? config.s2b_product_id ?? liveMockups.length)}
        />
        <div className="relative min-h-0 flex-1 overflow-x-auto">
          {!iframeReady ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50">
              <p className="text-sm text-slate-500">Opening S2BDIY editor…</p>
            </div>
          ) : null}
          <iframe
            key={designerUrl}
            src={designerUrl}
            title="S2BDIY Product Designer"
            className={cn(
              "border-0",
              isFullscreen ? "h-[calc(100vh-280px)] min-h-[520px] w-full" : "h-[min(72vh,860px)] min-h-[680px] w-full"
            )}
            style={{ minWidth: isFullscreen ? undefined : 1280 }}
            allow="clipboard-read; clipboard-write"
            onLoad={() => setIframeReady(true)}
          />
        </div>
        <MockupPreviewStrip
          mockups={liveMockups}
          title="商品预览"
          badge={previewBadge}
          compact={isFullscreen}
        />
        {syncError ? (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            {syncError}
          </div>
        ) : null}
        {!liveMockups.length ? (
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            在 S2BDIY 编辑器中保存设计后，mockup 会自动同步到下方商品预览，并写入商品主图。也可点「同步预览」手动刷新。
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** @deprecated Use ProductEditorPanel */
export const S2bDesignerEmbed = ProductEditorPanel
