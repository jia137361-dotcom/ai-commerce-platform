import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { translateText } from "../../../lib/translate"
import { sendError } from "../../_helpers/store-core"

type TranslateBody = {
  text?: string
  target?: string
  source?: string
}

export const POST = async (
  req: MedusaRequest<TranslateBody>,
  res: MedusaResponse
) => {
  const { text, target, source } = req.body ?? {}

  if (!text || typeof text !== "string" || !text.trim()) {
    return sendError(res, 400, "VALIDATION_ERROR", "text is required")
  }

  if (!target || typeof target !== "string") {
    return sendError(res, 400, "VALIDATION_ERROR", "target language is required")
  }

  try {
    const result = await translateText(text, target, source)
    return res.json({
      translated: result.translatedText,
      source: source ?? result.detectedLanguage?.language ?? "auto",
      target,
    })
  } catch (err: any) {
    return sendError(
      res,
      502,
      "EXTERNAL_SERVICE_ERROR",
      err?.message ?? "Translation service unavailable"
    )
  }
}
