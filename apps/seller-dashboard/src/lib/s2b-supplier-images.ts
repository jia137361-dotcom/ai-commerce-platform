export type SupplierImageOption = {
  id: string
  url: string
  label: string
  colorName?: string | null
}

export function mergeSelectedSupplierImages(
  currentUrls: string[],
  selectedSupplierUrls: string[],
  allSupplierUrls: string[],
) {
  const supplierSet = new Set(allSupplierUrls)
  return Array.from(new Set([
    ...currentUrls.filter((url) => !supplierSet.has(url)),
    ...selectedSupplierUrls,
  ]))
}

export function buildSupplierImageOptions(
  colorImages: Array<{ colorName?: string | null; images: string[] }>,
  officialImages: Array<{ url: string; colorName?: string | null }> = [],
): SupplierImageOption[] {
  const seen = new Set<string>()
  const options: SupplierImageOption[] = []
  const push = (url: string, colorName?: string | null) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    options.push({ id: `supplier_image_${options.length}`, url, colorName, label: colorName || `Official image ${options.length + 1}` })
  }
  colorImages.forEach((entry) => entry.images.forEach((url) => push(url, entry.colorName)))
  officialImages.forEach((image) => push(image.url, image.colorName))
  return options
}
