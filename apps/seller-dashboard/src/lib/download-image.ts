const sanitizeFilename = (value: string) =>
  value
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "artwork"

const blobToJpegBlob = async (blob: Blob): Promise<Blob> => {
  if (blob.type === "image/jpeg") return blob

  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Unable to decode image for JPG export"))
      img.src = objectUrl
    })

    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas unavailable")
    ctx.drawImage(image, 0, 0)

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("JPG conversion failed"))),
        "image/jpeg",
        0.92
      )
    })
    return jpegBlob
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function downloadImageAsJpg(url: string, filenameBase: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`)
  }
  const sourceBlob = await response.blob()
  const jpegBlob = await blobToJpegBlob(sourceBlob)
  const objectUrl = URL.createObjectURL(jpegBlob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = `${sanitizeFilename(filenameBase)}.jpg`
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
