const LIBRETRANSLATE_URL =
  process.env.LIBRETRANSLATE_URL || "http://localhost:5000"

export type TranslateResult = {
  translatedText: string
  detectedLanguage?: { confidence: number; language: string }
}

export async function translateText(
  text: string,
  target: string,
  source?: string
): Promise<TranslateResult> {
  const body: Record<string, unknown> = { q: text, source: source || "en", target }

  const res = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`LibreTranslate error (${res.status}): ${err}`)
  }

  return res.json()
}
