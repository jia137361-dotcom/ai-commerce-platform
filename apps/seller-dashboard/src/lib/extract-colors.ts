export async function extractDominantColors(imageUrl: string, count = 4): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const size = 64
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(["#FF6600", "#6B7280", "#1F2937", "#F59E0B"])
        return
      }
      ctx.drawImage(img, 0, 0, size, size)
      const data = ctx.getImageData(0, 0, size, size).data
      const buckets = new Map<string, number>()
      for (let i = 0; i < data.length; i += 16) {
        const r = Math.round(data[i] / 32) * 32
        const g = Math.round(data[i + 1] / 32) * 32
        const b = Math.round(data[i + 2] / 32) * 32
        const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`
        buckets.set(hex, (buckets.get(hex) ?? 0) + 1)
      }
      const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex)
      resolve(sorted.slice(0, count).length ? sorted.slice(0, count) : ["#FF6600", "#6B7280", "#1F2937", "#F59E0B"])
    }
    img.onerror = () => resolve(["#FF6600", "#6B7280", "#1F2937", "#F59E0B"])
    img.src = imageUrl
  })
}
