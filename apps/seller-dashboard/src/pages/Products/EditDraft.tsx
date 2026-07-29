import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, ApiError, STOREFRONT_URL } from "../../lib/api-client"
import { storeProductPath, storeProductPermanentDeletePath } from "../../lib/store-product-api"
import { buildProductGallery } from "../../lib/product-gallery"
import {
  needsS2bProvisionBeforePublish,
  resolveProductFulfillmentStatus,
} from "../../lib/product-fulfillment-status"
import { useToast } from "../../components/ToastProvider"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { Input, Label, Textarea } from "../../components/ui/Input"
import { Modal } from "../../components/ui/Modal"
import { Skeleton } from "../../components/ui/EmptyState"
import { ProductEditorPanel } from "../../components/ProductEditorPanel"
import { CategoryTreePicker } from "../../components/CategoryTreePicker"
import { TranslateButton } from "../../components/TranslateButton"
import { getSellerStoreId } from "../../lib/seller-store-id"
import { fileToBase64 } from "../../lib/file-to-base64"
import type { NormalizedProduct, ProductRegionSummary, ProductVariantRow } from "@ai-commerce/shared-types"

type SupplierVariant = {
  supplier_variant_id: string
  supplier_size_id?: string | null
  supplier_color_id?: string | null
  color?: string | null
  size?: string | null
  color_name?: string | null
  size_name?: string | null
}

type EditLocationState = {
  product?: NormalizedProduct
  generation?: Record<string, unknown>
  jobId?: string
  aiReview?: boolean
}

const toVariantRows = (
  rows: unknown,
  fallbackPrice: number
): ProductVariantRow[] => {
  if (!Array.isArray(rows)) return []
  return rows
    .flatMap((row): ProductVariantRow[] => {
      if (!row || typeof row !== "object") return []
      const v = row as Record<string, unknown>
      const supplierVariantId = String(v.supplier_variant_id ?? "")
      if (!supplierVariantId) return []
      return [{
        supplier_variant_id: supplierVariantId,
        medusa_variant_id: typeof v.medusa_variant_id === "string" ? v.medusa_variant_id : undefined,
        supplier_size_id: typeof v.supplier_size_id === "string" ? v.supplier_size_id : undefined,
        supplier_color_id: typeof v.supplier_color_id === "string" ? v.supplier_color_id : undefined,
        option_type: typeof v.option_type === "string" ? v.option_type : undefined,
        option_value: typeof v.option_value === "string" ? v.option_value : undefined,
        color: String(v.color ?? "Default"),
        size: String(v.size ?? "Default"),
        price: Number(v.price ?? fallbackPrice) || fallbackPrice,
        cost: typeof v.cost === "number" ? v.cost : undefined,
        weight: typeof v.weight === "number" ? v.weight : null,
        supplier_sku: typeof v.supplier_sku === "string" ? v.supplier_sku : null,
        image_url: typeof v.image_url === "string" ? v.image_url : null,
        enabled: v.enabled !== false,
      }]
    })
}

const buildVariantsFromSupplier = (
  supplierVariants: SupplierVariant[],
  fallbackPrice: number
): ProductVariantRow[] =>
  supplierVariants.map((variant) => ({
    supplier_variant_id: variant.supplier_variant_id,
    supplier_size_id: variant.supplier_size_id ?? undefined,
    supplier_color_id: variant.supplier_color_id ?? undefined,
    color: variant.color_name ?? variant.color ?? "Default",
    size: variant.size_name ?? variant.size ?? "Default",
    price: fallbackPrice,
    enabled: true,
  }))

const readStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.flatMap((entry) => (typeof entry === "string" && entry.trim() ? [entry.trim()] : []))
    : []

const readS2bColorImages = (value: unknown) =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return []
        const row = entry as Record<string, unknown>
        const colorName = typeof row.color_name === "string" && row.color_name.trim() ? row.color_name.trim() : "Default"
        const colorId = typeof row.color_id === "string" ? row.color_id : String(row.color_id ?? "")
        const images = readStringArray(row.images)
        return images.length ? [{ colorId, colorName, images }] : []
      })
    : []

const newManualVariant = (price: number, index: number): ProductVariantRow => ({
  supplier_variant_id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `manual-${crypto.randomUUID()}`
      : `manual-${Date.now()}-${index}`,
  option_type: "",
  option_value: "",
  color: "Default",
  size: "Default",
  price,
  supplier_sku: index === 0 ? "MANUAL-DEFAULT" : "",
  image_url: null,
  enabled: true,
})

const validateProductImageFile = (file: File) => {
  if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
    return "Only PNG and JPG files are supported"
  }
  if (file.size > 2 * 1024 * 1024) {
    return "Image must be 2MB or smaller"
  }
  return null
}

export function EditDraftPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(false)
  const [variantsInitialized, setVariantsInitialized] = useState(false)

  const stateProduct = (location.state as EditLocationState | null)?.product
  const stateGeneration = (location.state as EditLocationState | null)?.generation
  const stateJobId = (location.state as EditLocationState | null)?.jobId
  const aiReviewFromQuery = new URLSearchParams(location.search).get("review") === "ai"
  const aiReview =
    aiReviewFromQuery ||
    Boolean((location.state as EditLocationState | null)?.aiReview) ||
    Boolean(stateGeneration)

  const { data, isLoading } = useQuery({
    queryKey: ["product", id],
    enabled: Boolean(id),
    queryFn: () => apiFetch<{ product: NormalizedProduct }>(storeProductPath(id!)),
    retry: false,
    refetchOnMount: "always",
  })

  const product = data?.product ?? stateProduct

  const {
    data: regionData,
    isLoading: regionsLoading,
    isError: regionsError,
    error: regionsFetchError,
  } = useQuery({
    queryKey: ["market-regions"],
    queryFn: () =>
      apiFetch<{ regions: ProductRegionSummary[] }>("/admin/market-regions?ensure=true"),
  })

  const { data: supplierData, isLoading: supplierLoading, isError: supplierError, error: supplierFetchError } = useQuery({
    queryKey: ["supplier-products", product?.platform_product_id],
    enabled: Boolean(product?.platform_product_id),
    queryFn: () =>
      apiFetch<{
        supplier_products: Array<{
          supplier_product_id: string
          name: string
          variants: SupplierVariant[]
        }>
      }>(`/admin/supplier-products?platform_product_id=${product?.platform_product_id}`),
  })

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [variants, setVariants] = useState<ProductVariantRow[]>([])
  const [requiresShipping, setRequiresShipping] = useState(true)
  const [supportedRegionIds, setSupportedRegionIds] = useState<string[]>([])
  const [previewKey, setPreviewKey] = useState<string>("mockup_front")
  const [showCustomizeEditor, setShowCustomizeEditor] = useState(false)
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([])
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const resolvedJobId = stateJobId ?? product?.ai_job_id ?? null

  const { data: jobData } = useQuery({
    queryKey: ["ai-job", resolvedJobId],
    enabled: Boolean(resolvedJobId) && Boolean(product) && product!.status === "draft",
    queryFn: () =>
      apiFetch<{
        result?: {
          generation?: Record<string, unknown>
          s2b_provision_error?: string | null
        }
      }>(`/admin/ai/jobs/${resolvedJobId}`),
    retry: false,
  })

  useEffect(() => {
    const p = data?.product ?? stateProduct
    if (!p) return

    setTitle(p.title ?? "")
    setDescription(p.description ?? "")
    setPrice(String(p.price ?? ""))
    setTags(Array.isArray(p.tags) ? p.tags : [])
    setCategoryIds(Array.isArray(p.category_ids) ? p.category_ids : [])
    setRequiresShipping(
      typeof p.requires_shipping === "boolean"
        ? p.requires_shipping
        : typeof p.metadata?.requires_shipping === "boolean"
          ? p.metadata.requires_shipping
          : Boolean(p.supplier_product_id || p.platform_product_id)
    )
    const savedRegionIds = Array.isArray(p.supported_region_ids)
      ? p.supported_region_ids
      : Array.isArray(p.metadata?.supported_region_ids)
        ? p.metadata.supported_region_ids.filter((id): id is string => typeof id === "string")
        : []
    setSupportedRegionIds(savedRegionIds)
    setSelectedImageUrls(readStringArray(p.metadata?.image_urls))

    const savedVariants = toVariantRows(p.variants, Number(p.price ?? 0) || 0)
    if (savedVariants.length) {
      setVariants(savedVariants)
      setVariantsInitialized(true)
    } else if (p.metadata?.is_own_product === true || p.metadata?.fulfillment_mode === "self_managed") {
      setVariants([newManualVariant(Number(p.price ?? 0) || 24.99, 0)])
      setVariantsInitialized(true)
    }
  }, [data, stateProduct])

  useEffect(() => {
    if (variantsInitialized || variants.length || !product || !supplierData) return

    const supplierProduct =
      supplierData.supplier_products.find(
        (row) => row.supplier_product_id === product.supplier_product_id
      ) ?? supplierData.supplier_products[0]

    if (!supplierProduct?.variants?.length) {
      setVariantsInitialized(true)
      return
    }

    const fallbackPrice = Number(price) || Number(product.price) || 0
    setVariants(buildVariantsFromSupplier(supplierProduct.variants, fallbackPrice))
    setVariantsInitialized(true)
  }, [supplierData, product, variants.length, variantsInitialized, price])

  const isOwnProduct =
    product?.metadata?.is_own_product === true ||
    product?.metadata?.fulfillment_mode === "self_managed" ||
    product?.metadata?.logistics_mode === "self_managed"

  const isS2bSupplierProduct =
    !isOwnProduct &&
    (product?.supplier_id === "sup_s2bdiy" ||
      product?.metadata?.synced_from_supplier === true ||
      product?.metadata?.import_source === "s2bdiy_supplier" ||
      product?.metadata?.import_source === "s2bdiy_csv")

  const s2bColorImages = readS2bColorImages(product?.metadata?.s2b_color_images)
  const s2bCategoryLabels = [
    ...readStringArray(product?.metadata?.category_path),
    typeof product?.metadata?.category_level_1 === "string" ? product.metadata.category_level_1 : "",
    typeof product?.metadata?.category_level_2 === "string" ? product.metadata.category_level_2 : "",
  ].filter(Boolean)
  const s2bWarehouseLabel =
    typeof product?.metadata?.warehouse_region === "string" ? product.metadata.warehouse_region : product?.ship_from_label
  const s2bSellableCountries = readStringArray(product?.metadata?.sellable_country_codes)

  const { mockups, diyAssets } = buildProductGallery(product, stateGeneration ?? jobData?.result?.generation, {
    cacheKey: resolvedJobId,
    preferProduct: Boolean(product?.metadata?.gallery),
  })
  const s2bImageOptions = selectedImageUrls.map((url, index) => ({
    id: `s2b_image_${index}`,
    label: `Image ${index + 1}`,
    url,
    kind: "mockup" as const,
  }))
  const manualImageOptions = selectedImageUrls.map((url, index) => ({
    id: `manual_image_${index}`,
    label: `Image ${index + 1}`,
    url,
    kind: "mockup" as const,
  }))
  const previewOptions = isS2bSupplierProduct && s2bImageOptions.length
    ? s2bImageOptions
    : manualImageOptions.length
      ? manualImageOptions
      : mockups

  const s2bProvisionError =
    (typeof product?.metadata?.s2b_provision_error === "string"
      ? product.metadata.s2b_provision_error
      : null) ??
    jobData?.result?.s2b_provision_error ??
    null

  const fulfillmentStatus = useMemo(
    () => resolveProductFulfillmentStatus(product, { s2bProvisionError }),
    [product, s2bProvisionError]
  )

  const styleLabel =
    typeof product?.metadata?.style_preset_label === "string"
      ? product.metadata.style_preset_label
      : typeof stateGeneration?.style_preset_label === "string"
        ? stateGeneration.style_preset_label
        : typeof jobData?.result?.generation?.style_preset_label === "string"
          ? jobData.result.generation.style_preset_label
          : null

  const aiMockMode =
    product?.metadata?.ai_worker_mock_mode === true ||
    jobData?.result?.generation?.mock_mode === true

  const aiMockModeReason =
    (typeof product?.metadata?.ai_worker_mock_mode_reason === "string"
      ? product.metadata.ai_worker_mock_mode_reason
      : null) ??
    (typeof jobData?.result?.generation?.mock_mode_reason === "string"
      ? jobData.result.generation.mock_mode_reason
      : null)

  const activePreviewUrl =
    previewOptions.find((option) => option.id === previewKey)?.url ??
    previewOptions[0]?.url

  useEffect(() => {
    if (!previewOptions.length) return
    if (!previewOptions.some((option) => option.id === previewKey)) {
      setPreviewKey(previewOptions[0].id)
    }
  }, [product?.product_id, product?.metadata?.gallery, previewKey, previewOptions.length])

  useEffect(() => {
    if (!regionData?.regions.length || supportedRegionIds.length) return
    if (!product) return
    const savedRegionIds = Array.isArray(product.supported_region_ids)
      ? product.supported_region_ids
      : Array.isArray(product.metadata?.supported_region_ids)
        ? product.metadata.supported_region_ids.filter((id): id is string => typeof id === "string")
        : []
    if (!savedRegionIds.length) {
      setSupportedRegionIds(regionData.regions.map((region) => region.region_id))
    }
  }, [product, regionData, supportedRegionIds.length])

  const parsePrice = () => {
    const parsed = Number(price)
    return Number.isFinite(parsed) ? parsed : NaN
  }

  const buildPayload = () => {
    const selectedImageSet = new Set(selectedImageUrls)
    const selectedColorImage = (color: string) =>
      s2bColorImages
        .filter((entry) => entry.colorName === color)
        .flatMap((entry) => entry.images)
        .find((url) => selectedImageSet.has(url)) ?? null
    const normalizedVariants = variants.map((variant) => ({
      ...variant,
      image_url:
        variant.enabled === false
          ? null
          : isS2bSupplierProduct
            ? (variant.image_url && selectedImageSet.has(variant.image_url)
                ? variant.image_url
                : selectedColorImage(variant.color))
            : (variant.image_url || selectedImageUrls[0] || null),
      enabled: variant.enabled !== false,
    }))
    return {
      title: title.trim(),
      description,
      price: parsePrice(),
      tags,
      category_ids: categoryIds,
      variants: normalizedVariants,
      requires_shipping: isS2bSupplierProduct ? true : requiresShipping,
      supported_region_ids: isS2bSupplierProduct ? supportedRegionIds : supportedRegionIds,
      ship_from_country: isS2bSupplierProduct ? product?.ship_from_country ?? null : null,
      image_url: selectedImageUrls[0] ?? product?.image_url ?? null,
      mockup_image_url: selectedImageUrls[0] ?? product?.mockup_image_url ?? null,
      metadata: {
        ...(product?.metadata ?? {}),
        is_own_product: isOwnProduct || product?.metadata?.is_own_product === true,
        fulfillment_mode: isOwnProduct ? "self_managed" : product?.metadata?.fulfillment_mode,
        logistics_mode: isOwnProduct ? "self_managed" : product?.metadata?.logistics_mode,
        requires_shipping: isS2bSupplierProduct ? true : requiresShipping,
        supported_region_ids: supportedRegionIds,
        image_urls: selectedImageUrls,
      },
    }
  }

  const formatError = (err: unknown) => {
    if (err instanceof ApiError) return err.message
    return err instanceof Error ? err.message : "Request failed"
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch(storeProductPath(id!), {
        method: "PUT",
        body: JSON.stringify(buildPayload()),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      toast.push("Draft saved", "success")
    },
    onError: (err: unknown) => {
      toast.push(formatError(err), "error")
    },
  })

  const validateBeforeSave = () => {
    if (!title.trim()) {
      toast.push("Product title is required", "error")
      return false
    }
    const parsedPrice = parsePrice()
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast.push("Enter a valid base price", "error")
      return false
    }
    if (!isS2bSupplierProduct && !supportedRegionIds.length) {
      toast.push("Select at least one sales region", "error")
      return false
    }
    return true
  }

  const publishMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(storeProductPath(id!), {
        method: "PUT",
        body: JSON.stringify(buildPayload()),
      })
      return apiFetch(`/admin/products/${id}/publish`, { method: "POST" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      toast.push("Published to storefront", "success")
      navigate("/products")
    },
    onError: (err: unknown) => {
      toast.push(formatError(err), "error")
    },
  })

  const provisionS2bMutation = useMutation({
    mutationFn: () =>
      apiFetch<{
        provisioned: boolean
        s2b_provision_error?: string | null
      }>(`/admin/products/${id}/provision-s2b`, { method: "POST" }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      if (res.provisioned) {
        toast.push("S2BDIY fulfillment linked", "success")
      } else if (res.s2b_provision_error) {
        toast.push(res.s2b_provision_error, "error")
      }
    },
    onError: (err: unknown) => {
      toast.push(formatError(err), "error")
    },
  })

  const confirmPublishMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(storeProductPath(id!), {
        method: "PUT",
        body: JSON.stringify(buildPayload()),
      })
      if (needsS2bProvisionBeforePublish(product, { s2bProvisionError })) {
        const provision = await apiFetch<{
          provisioned: boolean
          s2b_provision_error?: string | null
        }>(`/admin/products/${id}/provision-s2b`, { method: "POST" })
        if (!provision.provisioned) {
          throw new ApiError(
            502,
            "S2B_PROVISION_FAILED",
            provision.s2b_provision_error ?? "S2BDIY provisioning failed"
          )
        }
      }
      return apiFetch(`/admin/products/${id}/publish`, { method: "POST" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      toast.push("Design confirmed and published to storefront", "success")
      navigate("/products")
    },
    onError: (err: unknown) => {
      toast.push(formatError(err), "error")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(storeProductPath(id!), { method: "DELETE" }),
    onSuccess: () => navigate("/products"),
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Archive failed", "error")
    },
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: () => apiFetch(storeProductPermanentDeletePath(id!), { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.push("Product permanently deleted", "success")
      navigate("/products")
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Delete failed", "error")
    },
  })

  const restoreMutation = useMutation({
    mutationFn: () =>
      apiFetch(storeProductPath(id!), {
        method: "PUT",
        body: JSON.stringify({ status: "draft" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      toast.push("Restored to draft — you can edit again", "success")
    },
    onError: (err: unknown) => {
      toast.push(formatError(err), "error")
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ product_id: string }>(`/admin/products/${id}/duplicate`, { method: "POST" }),
    onSuccess: (res) => navigate(`/products/${res.product_id}/edit`),
    onError: (err: unknown) => {
      toast.push(formatError(err), "error")
    },
  })

  const updateVariant = (
    index: number,
    field: keyof ProductVariantRow,
    value: string | boolean
  ) => {
    setVariants((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        if (field === "price") {
          return { ...row, [field]: Number(value) || 0 }
        }
        return { ...row, [field]: value }
      })
    )
  }

  const addManualVariant = () => {
    const fallbackPrice = Number(price) || Number(product?.price) || 24.99
    setVariants((current) => [...current, newManualVariant(fallbackPrice, current.length)])
  }

  const removeManualVariant = (index: number) => {
    setVariants((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  const uploadProductImages = async (files: FileList | null) => {
    if (!files?.length || !id) return
    const nextFiles = Array.from(files)
    for (const file of nextFiles) {
      const validation = validateProductImageFile(file)
      if (validation) {
        toast.push(validation, "error")
        return
      }
    }

    setImageUploading(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of nextFiles) {
        const fileBase64 = await fileToBase64(file)
        const res = await apiFetch<{ url: string; image_urls?: string[] }>(
          `${storeProductPath(id)}/images`,
          {
            method: "POST",
            body: JSON.stringify({
              file_base64: fileBase64,
              content_type: file.type || "image/png",
            }),
          }
        )
        if (res.url) uploadedUrls.push(res.url)
      }
      if (uploadedUrls.length) {
        setSelectedImageUrls((current) => Array.from(new Set([...current, ...uploadedUrls])))
        toast.push("Product image uploaded", "success")
        void queryClient.invalidateQueries({ queryKey: ["product", id] })
      }
    } catch (err: unknown) {
      toast.push(formatError(err), "error")
    } finally {
      setImageUploading(false)
    }
  }

  const restoreSupplierImages = () => {
    const urls = Array.from(new Set(s2bColorImages.flatMap((entry) => entry.images)))
    if (urls.length) setSelectedImageUrls(urls)
  }

  const variantColors = Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean)))
  const variantSizes = Array.from(new Set(variants.map((variant) => variant.size).filter(Boolean)))
  const enabledColors = new Set(variants.filter((variant) => variant.enabled !== false).map((variant) => variant.color))
  const enabledSizes = new Set(variants.filter((variant) => variant.enabled !== false).map((variant) => variant.size))
  const imageUrlsForColor = (color: string) => {
    const fromMeta = s2bColorImages
      .filter((entry) => entry.colorName === color)
      .flatMap((entry) => entry.images)
    const fromVariants = variants
      .filter((variant) => variant.color === color && variant.image_url)
      .map((variant) => variant.image_url as string)
    return Array.from(new Set([...fromMeta, ...fromVariants]))
  }
  const toggleColor = (color: string) => {
    const shouldEnable = !enabledColors.has(color)
    const colorImages = imageUrlsForColor(color)
    setVariants((current) =>
      current.map((variant) => variant.color === color ? { ...variant, enabled: shouldEnable } : variant)
    )
    if (colorImages.length) {
      setSelectedImageUrls((current) =>
        shouldEnable
          ? Array.from(new Set([...current, ...colorImages]))
          : current.filter((url) => !colorImages.includes(url))
      )
    }
  }
  const toggleSize = (size: string) => {
    const shouldEnable = !enabledSizes.has(size)
    setVariants((current) =>
      current.map((variant) => variant.size === size ? { ...variant, enabled: shouldEnable } : variant)
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validateBeforeSave()) return
    saveMutation.mutate()
  }

  if (isLoading && !stateProduct) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[min(78vh,920px)] min-h-[560px]" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!product) {
    return <p className="text-slate-600">Product not found</p>
  }

  const openPreview = () => {
    if (product.status !== "published") {
      toast.push("Publish the product first to preview it on the buyer storefront.", "info")
      return
    }
    window.open(
      `${STOREFRONT_URL}/products/${product.product_id}?store=${encodeURIComponent(getSellerStoreId())}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  const isArchived = product.status === "archived"
  const isDraft = !isArchived && product.status === "draft"
  const isAiDraftReview =
    isDraft &&
    !isS2bSupplierProduct &&
    (aiReview ||
      product.source === "ai" ||
      Boolean(product.ai_job_id) ||
      Boolean(product.platform_product_id) ||
      fulfillmentStatus.state !== "not_applicable")
  const useConfirmPublish = isAiDraftReview && !isS2bSupplierProduct
  const isBusy =
    saveMutation.isPending ||
    publishMutation.isPending ||
    confirmPublishMutation.isPending ||
    provisionS2bMutation.isPending ||
    restoreMutation.isPending ||
    duplicateMutation.isPending ||
    imageUploading

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/products" className="text-slate-500 hover:text-brand">
            ← Back
          </Link>
          <div>
            {isAiDraftReview ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-emerald-600">
                  <span aria-hidden>✓</span>
                  <h1 className="text-2xl font-bold text-slate-900">Review AI Design</h1>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Preview mockups in the editor, edit copy and pricing, then publish.
                </p>
                {styleLabel ? (
                  <p className="mt-2 inline-flex rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand">
                    Style: {styleLabel}
                  </p>
                ) : null}
              </>
            ) : (
              <h1 className="text-2xl font-bold">{isArchived ? "Archived product" : "Edit Draft"}</h1>
            )}
          </div>
          <Badge label={product.status} />
        </div>
        <div className="flex gap-2">
          {!isArchived ? (
            <>
              {!isDraft ? (
                <Button variant="outline" type="button" onClick={openPreview}>
                  Preview
                </Button>
              ) : null}
              {product.status === "draft" ? (
                useConfirmPublish ? (
                  <Button
                    disabled={isBusy}
                    onClick={() => {
                      if (validateBeforeSave()) confirmPublishMutation.mutate()
                    }}
                  >
                    {confirmPublishMutation.isPending ? "Publishing…" : "Confirm & Publish"}
                  </Button>
                ) : (
                  <Button
                    disabled={isBusy}
                    onClick={() => {
                      if (validateBeforeSave()) publishMutation.mutate()
                    }}
                  >
                    {publishMutation.isPending ? "Publishing…" : "Publish"}
                  </Button>
                )
              ) : product.is_cart_addable === false ? (
                <Button
                  disabled={isBusy}
                  onClick={() => {
                    if (validateBeforeSave()) publishMutation.mutate()
                  }}
                >
                  {publishMutation.isPending ? "Enabling…" : "Enable cart"}
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={isBusy}
                onClick={() => duplicateMutation.mutate()}
              >
                {duplicateMutation.isPending ? "Duplicating…" : "Duplicate"}
              </Button>
              <Button disabled={isBusy} onClick={() => restoreMutation.mutate()}>
                {restoreMutation.isPending ? "Restoring…" : "Restore to draft"}
              </Button>
              <Button variant="danger" disabled={isBusy} onClick={() => setConfirmPermanentDelete(true)}>
                Delete permanently
              </Button>
            </>
          )}
        </div>
      </div>

      {isArchived ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This product is archived and cannot be edited. Restore it to draft or duplicate to create
          a new editable copy.
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className={isDraft ? "flex flex-col gap-6" : "grid gap-8 lg:grid-cols-2"}
      >
        <div className="space-y-4">
          {isDraft && id && isAiDraftReview && (!isS2bSupplierProduct || showCustomizeEditor) ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Product Editor
              </div>
              <ProductEditorPanel
                productId={id}
                mockups={previewOptions}
                diyAssets={diyAssets}
                aiMockMode={aiMockMode}
                aiMockModeReason={aiMockModeReason}
                className="p-3 sm:p-4"
                onDesignSaved={() => {
                  void queryClient.invalidateQueries({ queryKey: ["product", id] })
                  toast.push("Design saved in editor", "success")
                }}
              />
            </Card>
          ) : null}

          {isDraft && id && isS2bSupplierProduct && !showCustomizeEditor ? (
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Supplier product preview</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Edit title, description, images, and included variants. Open the custom editor only if this item needs artwork changes.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => setShowCustomizeEditor(true)}>
                  Customize edit
                </Button>
              </div>
            </Card>
          ) : null}

          {!isDraft && !isArchived ? (
          <>
          <Card className="overflow-hidden p-0">
            {activePreviewUrl ? (
              <img
                src={activePreviewUrl}
                alt={title}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-slate-100 text-slate-400">
                No preview
              </div>
            )}
            {product.source === "ai" ? (
              <div className="border-t bg-brand-light px-4 py-2 text-xs font-semibold uppercase text-brand">
                AI Generated Draft
              </div>
            ) : null}
          </Card>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              T-shirt Mockup Preview
            </p>
            {previewOptions.length ? (
              <div className="flex flex-wrap gap-3">
                {previewOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={`Show ${option.label}`}
                    aria-pressed={previewKey === option.id}
                    onClick={() => setPreviewKey(option.id)}
                    className="text-center"
                  >
                    <div
                      className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition ${
                        previewKey === option.id
                          ? "border-brand ring-2 ring-brand/30"
                          : "border-slate-200 hover:border-brand/50"
                      }`}
                    >
                      <img
                        src={option.url}
                        alt={option.label}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{option.label}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No mockup views available.</p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              {previewOptions.length} view{previewOptions.length === 1 ? "" : "s"} · Front / Back /
              On-body when generated
            </p>
          </div>

          {diyAssets.length ? (
            <Card>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Production Files
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Print Artwork is the flat graphic. Print File is the supplier-ready production asset.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {diyAssets.map((asset) => (
                  <a
                    key={asset.id}
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-lg border border-slate-200"
                  >
                    <img
                      src={asset.url}
                      alt={asset.label}
                      className="aspect-square w-full object-cover transition group-hover:opacity-90"
                    />
                    <p className="border-t px-3 py-2 text-sm font-medium text-slate-700">
                      {asset.label}
                    </p>
                  </a>
                ))}
              </div>
            </Card>
          ) : null}
          </>
          ) : null}
        </div>

        <Card className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <Label>Product Title</Label>
              {!isArchived && (
                <TranslateButton
                  text={title}
                  onTranslated={setTitle}
                  disabled={isArchived}
                />
              )}
            </div>
            <Input
              className="mt-1 text-lg font-semibold"
              value={title}
              disabled={isArchived}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label>Description</Label>
              {!isArchived && (
                <TranslateButton
                  text={description}
                  onTranslated={setDescription}
                  disabled={isArchived}
                />
              )}
            </div>
            <Textarea
              className="mt-1"
              rows={5}
              value={description}
              disabled={isArchived}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {previewOptions.length || (isOwnProduct && !isArchived) ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Publish image preview</Label>
                {isOwnProduct && !isArchived ? (
                  <div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      multiple
                      className="hidden"
                      disabled={imageUploading}
                      onChange={(event) => {
                        void uploadProductImages(event.target.files)
                        if (imageInputRef.current) imageInputRef.current.value = ""
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={imageUploading}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {imageUploading ? "Uploading…" : "Upload images"}
                    </Button>
                  </div>
                ) : null}
              </div>
              {previewOptions.length ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {previewOptions.map((option) => (
                    <div key={option.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <img src={option.url} alt={option.label} className="aspect-square w-full object-cover" />
                      <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-slate-500">
                        <span className="truncate">{option.label}</span>
                        {!isArchived ? (
                        <button
                          type="button"
                          className="font-medium text-red-600"
                          onClick={() => setSelectedImageUrls((current) => current.filter((url) => url !== option.url))}
                        >
                          Remove
                        </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Upload product images before publishing.
                </div>
              )}
              {isS2bSupplierProduct && s2bColorImages.length ? (
                <Button type="button" variant="outline" className="mt-2" onClick={restoreSupplierImages}>
                  Restore supplier images
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Base Price</Label>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                value={price}
                disabled={isArchived || isS2bSupplierProduct}
                onChange={(e) => setPrice(e.target.value)}
              />
              {isS2bSupplierProduct ? (
                <p className="mt-1 text-xs text-slate-500">Locked to S2BDIY purchase cost × 2.3 after CNY→USD conversion.</p>
              ) : null}
            </div>
            <div>
              <Label>Default Stock</Label>
              <Input className="mt-1" value={isS2bSupplierProduct ? "Managed by supplier on order" : "Self-managed"} readOnly />
            </div>
          </div>
          <div>
            <Label>Search Tags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm"
                >
                  {tag}
                  {!isArchived ? (
                    <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
              {!isArchived ? (
              <button
                type="button"
                className="rounded-full border border-dashed border-brand px-3 py-1 text-sm text-brand"
                onClick={() => {
                  const next = window.prompt("Add tag")
                  if (next?.trim()) setTags([...tags, next.trim()])
                }}
              >
                + Add tag
              </button>
              ) : null}
            </div>
          </div>

          {!isS2bSupplierProduct ? (
          <div>
            <Label>Categories</Label>
            <div className="mt-1">
              <CategoryTreePicker
                selectedIds={categoryIds}
                onChange={setCategoryIds}
                disabled={isArchived}
              />
            </div>
          </div>
          ) : (
          <div>
            <Label>S2B Category</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(s2bCategoryLabels.length ? Array.from(new Set(s2bCategoryLabels)) : ["Uncategorized"]).map((label) => (
                <span key={label} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{label}</span>
              ))}
            </div>
          </div>
          )}

          {!isS2bSupplierProduct && fulfillmentStatus.state !== "not_applicable" ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">S2BDIY Fulfillment</p>
            <p className="mt-1 text-sm text-slate-500">{fulfillmentStatus.detail}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  fulfillmentStatus.state === "ready"
                    ? "bg-emerald-50 text-emerald-700"
                    : fulfillmentStatus.state === "error"
                      ? "bg-red-50 text-red-700"
                      : fulfillmentStatus.state === "pending"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                }`}
              >
                {fulfillmentStatus.label}
              </span>
              {fulfillmentStatus.state === "ready" && fulfillmentStatus.s2bProductId ? (
                <span className="font-mono text-xs text-slate-500">
                  S2B #{fulfillmentStatus.s2bProductId}
                </span>
              ) : null}
            </div>
            {isAiDraftReview &&
            (fulfillmentStatus.state === "pending" || fulfillmentStatus.state === "error") &&
            fulfillmentStatus.canRetry ? (
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                disabled={isBusy}
                onClick={() => provisionS2bMutation.mutate()}
              >
                {provisionS2bMutation.isPending ? "Linking S2BDIY…" : "Retry S2BDIY provisioning"}
              </Button>
            ) : null}
          </div>
          ) : null}

          {!isS2bSupplierProduct ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Self-managed fulfillment</p>
            <p className="mt-1 text-sm text-slate-500">
              You handle inventory and shipping for this own product. Buyers enter a delivery address and shipping method at checkout when physical delivery is required.
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={requiresShipping}
                disabled={isArchived}
                onChange={(e) => setRequiresShipping(e.target.checked)}
              />
              <span>
                <span className="font-medium text-slate-900">Requires physical delivery</span>
                <span className="mt-1 block text-slate-500">
                  Turn off only for digital goods that never ship.
                </span>
              </span>
            </label>
          </div>
          ) : (
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">S2B supplier fulfillment</p>
            <p className="mt-1 text-sm text-slate-500">
              This product is sourced from the S2B supplier catalog. Supplier inventory and order fulfillment are handled by the supplier; shipping service and cost are calculated later from the buyer address.
            </p>
          </div>
          )}

          {!isS2bSupplierProduct ? (
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Sales regions</p>
            <p className="mt-1 text-sm text-slate-500">
              Choose where buyers can purchase this product. Checkout addresses must match a supported region.
            </p>
            {regionsError ? (
              <p className="mt-3 text-sm text-red-600">
                Failed to load regions
                {regionsFetchError instanceof Error ? `: ${regionsFetchError.message}` : "."}
              </p>
            ) : regionData?.regions.length ? (
              <div className="mt-4 grid gap-2">
                {regionData.regions.map((region) => {
                  const checked = supportedRegionIds.includes(region.region_id)
                  return (
                    <label
                      key={region.region_id}
                      className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                        checked={checked}
                        disabled={isArchived}
                        onChange={(event) => {
                          setSupportedRegionIds((current) => {
                            if (event.target.checked) {
                              return Array.from(new Set([...current, region.region_id]))
                            }
                            return current.filter((id) => id !== region.region_id)
                          })
                        }}
                      />
                      <span>
                        <span className="font-medium text-slate-900">{region.name}</span>
                        <span className="mt-1 block text-slate-500">
                          {region.country_codes.map((code) => code.toUpperCase()).join(", ")} · {region.currency_code.toUpperCase()}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : regionsLoading ? (
              <p className="mt-3 text-sm text-slate-500">Loading available regions...</p>
            ) : (
              <p className="mt-3 text-sm text-amber-700">No regions configured. Run regions bootstrap on the backend.</p>
            )}
            {!supportedRegionIds.length ? (
              <p className="mt-3 text-sm text-amber-700">Select at least one region before saving.</p>
            ) : null}
          </div>
          ) : (
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Supplier shipping and sale region</p>
            <p className="mt-1 text-sm text-slate-500">
              {s2bWarehouseLabel || product.ship_from_label || "Supplier warehouse"}{s2bSellableCountries.length ? ` · ${s2bSellableCountries.join(", ")}` : ""}
            </p>
          </div>
          )}

          <div className="rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Product Variants
              </span>
              {isOwnProduct && !isArchived ? (
                <Button type="button" variant="outline" onClick={addManualVariant}>
                  Add variant
                </Button>
              ) : null}
            </div>
            {isS2bSupplierProduct && variants.length ? (
              <div className="space-y-5 p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Colors</p>
                    <span className="text-xs text-slate-500">{enabledColors.size} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variantColors.map((color) => {
                      const active = enabledColors.has(color)
                      const image = imageUrlsForColor(color)[0]
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => toggleColor(color)}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                            active ? "border-brand bg-brand-light text-brand" : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {image ? <img src={image} alt="" className="h-8 w-8 rounded object-cover" /> : null}
                          <span>{color}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Sizes</p>
                    <span className="text-xs text-slate-500">{enabledSizes.size} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variantSizes.map((size) => {
                      const active = enabledSizes.has(size)
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            active ? "border-brand bg-brand-light text-brand" : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-900">Enabled combinations</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {variants.filter((variant) => variant.enabled !== false).map((variant) => (
                      <div key={variant.supplier_variant_id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
                        {variant.image_url ? (
                          <img src={variant.image_url} alt="" className="h-12 w-12 rounded object-cover" />
                        ) : (
                          <span className="h-12 w-12 rounded bg-slate-50" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{variant.color} / {variant.size}</p>
                          <p className="text-xs text-slate-500">{variant.supplier_sku || variant.supplier_variant_id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : variants.length ? (
              <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="px-4 py-2">Include</th>
                    <th className="px-4 py-2">Image</th>
                    <th className="px-4 py-2">Option type</th>
                    <th className="px-4 py-2">Option value</th>
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2">Price</th>
                    {isOwnProduct ? <th className="px-4 py-2">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant, index) => (
                    <tr key={variant.supplier_variant_id} className="border-t">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={variant.enabled !== false}
                          disabled={isArchived}
                          onChange={(e) => updateVariant(index, "enabled", e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex min-w-40 items-center gap-2">
                          {variant.image_url ? (
                            <img src={variant.image_url} alt="" className="h-12 w-12 rounded border object-cover" />
                          ) : (
                            <span className="block h-12 w-12 rounded border bg-slate-50" />
                          )}
                          {isOwnProduct ? (
                            <Input
                              value={variant.image_url ?? ""}
                              placeholder="Image URL"
                              disabled={isArchived}
                              onChange={(e) => updateVariant(index, "image_url", e.target.value)}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={variant.option_type ?? ""}
                          placeholder="Material, Style, Color..."
                          disabled={isArchived || isS2bSupplierProduct}
                          onChange={(e) => updateVariant(index, "option_type", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={variant.option_value ?? ""}
                          placeholder="Cotton, Bundle A, Blue..."
                          disabled={isArchived || isS2bSupplierProduct}
                          onChange={(e) => updateVariant(index, "option_value", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={variant.supplier_sku ?? ""}
                          disabled={isArchived || isS2bSupplierProduct}
                          onChange={(e) => updateVariant(index, "supplier_sku", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={variant.price}
                          disabled={isArchived || isS2bSupplierProduct}
                          onChange={(e) => updateVariant(index, "price", e.target.value)}
                        />
                      </td>
                      {isOwnProduct ? (
                        <td className="px-4 py-2">
                          <Button
                            type="button"
                            variant="danger"
                            disabled={isArchived || variants.length <= 1}
                            onClick={() => removeManualVariant(index)}
                          >
                            Remove
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : supplierLoading || (Boolean(product?.platform_product_id) && !variantsInitialized && !supplierError) ? (
              <p className="px-4 py-6 text-sm text-slate-500">Loading variants…</p>
            ) : supplierError ? (
              <p className="px-4 py-6 text-sm text-red-600">
                {supplierFetchError instanceof Error
                  ? supplierFetchError.message
                  : "Unable to load supplier variants."}
              </p>
            ) : (
              <p className="px-4 py-6 text-sm text-slate-500">
                No variants available for this product yet.
              </p>
            )}
          </div>

          {!isArchived ? (
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="submit" variant="outline" disabled={isBusy}>
              Save as Draft
            </Button>
            {product.status === "draft" ? (
              useConfirmPublish ? (
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    if (validateBeforeSave()) confirmPublishMutation.mutate()
                  }}
                >
                  {confirmPublishMutation.isPending
                    ? "Confirming & publishing…"
                    : "Confirm & Publish to Storefront"}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    if (validateBeforeSave()) publishMutation.mutate()
                  }}
                >
                  {publishMutation.isPending ? "Publishing…" : "Publish to Storefront"}
                </Button>
              )
            ) : product.is_cart_addable === false ? (
              <Button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  if (validateBeforeSave()) publishMutation.mutate()
                }}
              >
                {publishMutation.isPending ? "Enabling…" : "Enable cart checkout"}
              </Button>
            ) : null}
            <Button type="button" variant="danger" onClick={() => setConfirmArchive(true)}>
              Archive
            </Button>
            {product.status === "draft" || product.status === "unpublished" ? (
              <Button type="button" variant="danger" onClick={() => setConfirmPermanentDelete(true)}>
                Delete permanently
              </Button>
            ) : null}
          </div>
          ) : null}
        </Card>
      </form>

      <Modal
        open={confirmArchive}
        title="Archive this draft?"
        onClose={() => setConfirmArchive(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmArchive(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteMutation.mutate()}>
              Archive
            </Button>
          </>
        }
      >
        The product will be archived and hidden from your catalog.
      </Modal>

      <Modal
        open={confirmPermanentDelete}
        title="Delete product permanently?"
        onClose={() => setConfirmPermanentDelete(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmPermanentDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => permanentDeleteMutation.mutate()}>
              Delete permanently
            </Button>
          </>
        }
      >
        This product will be permanently removed and cannot be restored.
      </Modal>
    </div>
  )
}
