import type { NormalizedProduct } from "@ai-commerce/shared-types"

type FulfillmentProduct = Partial<NormalizedProduct> & {
  supplier_id?: string | null
  supplier_material_id?: string | null
}

const CATALOG_SUPPLIER_PRODUCT_PREFIX = /^sp_/

export function isCatalogSupplierProductId(id: string | null | undefined): boolean {
  if (!id) return false
  return CATALOG_SUPPLIER_PRODUCT_PREFIX.test(id)
}

export function isS2bProvisioned(product: FulfillmentProduct): boolean {
  const supplierProductId = product.supplier_product_id
  if (!supplierProductId || isCatalogSupplierProductId(supplierProductId)) {
    return false
  }
  return Boolean(product.supplier_material_id) || /^\d+$/.test(supplierProductId)
}

export type ProductFulfillmentStatus =
  | { state: "not_applicable"; label: string; detail: string }
  | { state: "ready"; label: string; detail: string; s2bProductId?: string }
  | { state: "pending"; label: string; detail: string; canRetry: boolean }
  | { state: "error"; label: string; detail: string; canRetry: boolean }

export function resolveProductFulfillmentStatus(
  product: FulfillmentProduct | null | undefined,
  options?: { s2bProvisionError?: string | null }
): ProductFulfillmentStatus {
  if (!product) {
    return {
      state: "not_applicable",
      label: "Fulfillment",
      detail: "Product not loaded",
    }
  }

  const s2bError =
    options?.s2bProvisionError ??
    (typeof product.metadata?.s2b_provision_error === "string"
      ? product.metadata.s2b_provision_error
      : null)

  const hasPrintFile = Boolean(
    product.print_file_url ||
      (typeof product.metadata?.print_file_url === "string" && product.metadata.print_file_url)
  )

  const isAiOrPod =
    product.source === "ai" ||
    Boolean(product.supplier_id) ||
    Boolean(product.platform_product_id) ||
    hasPrintFile

  if (!isAiOrPod) {
    return {
      state: "not_applicable",
      label: "Fulfillment",
      detail: "No print-on-demand supplier linked",
    }
  }

  if (s2bError) {
    return {
      state: "error",
      label: "S2BDIY provisioning failed",
      detail: s2bError,
      canRetry: hasPrintFile,
    }
  }

  if (isS2bProvisioned(product)) {
    return {
      state: "ready",
      label: "S2BDIY ready",
      detail: "Print file uploaded and supplier product created for fulfillment.",
      s2bProductId: product.supplier_product_id ?? undefined,
    }
  }

  if (hasPrintFile) {
    return {
      state: "pending",
      label: "Awaiting S2BDIY provisioning",
      detail: "Print artwork is ready. Confirm & publish will register the design with S2BDIY.",
      canRetry: true,
    }
  }

  return {
    state: "pending",
    label: "Awaiting print file",
    detail: "Generation did not produce a print-ready file yet.",
    canRetry: false,
  }
}

export function needsS2bProvisionBeforePublish(
  product: FulfillmentProduct | null | undefined,
  options?: { s2bProvisionError?: string | null }
): boolean {
  const status = resolveProductFulfillmentStatus(product, options)
  return status.state === "pending" || status.state === "error"
}
