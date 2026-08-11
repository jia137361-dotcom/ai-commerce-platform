const REVIEW_IMAGE_MAX_EDGE = 1600
const REVIEW_IMAGE_JPEG_QUALITY = 0.85

export const prepareReviewImageUpload = async (
  file: File
): Promise<{ fileBase64: string; contentType: string }> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a PNG or JPEG image")
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(
    1,
    REVIEW_IMAGE_MAX_EDGE / bitmap.width,
    REVIEW_IMAGE_MAX_EDGE / bitmap.height
  )
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) {
    bitmap.close()
    throw new Error("Unable to process image")
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error("Unable to compress image"))
        else resolve(result)
      },
      "image/jpeg",
      REVIEW_IMAGE_JPEG_QUALITY
    )
  })

  const fileBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      resolve(result.includes(",") ? result.split(",")[1] ?? "" : result)
    }
    reader.onerror = () => reject(new Error("Unable to read compressed image"))
    reader.readAsDataURL(blob)
  })

  return { fileBase64, contentType: "image/jpeg" }
}
