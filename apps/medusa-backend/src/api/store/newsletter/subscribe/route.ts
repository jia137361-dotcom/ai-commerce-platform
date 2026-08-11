import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { appendNewsletterSubscriber, pickStoreSettingsRow } from "../../../../lib/store-engagement"
import { getStoreCoreService, sendError } from "../../../_helpers/store-core"
import { sendNewsletterWelcome } from "../../../../lib/email"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { store_id: storeId } = resolveCurrentStore(req)
    const body = (req.body ?? {}) as { email?: string }
    const email = typeof body.email === "string" ? body.email.trim() : ""
    if (!email) {
      return sendError(res, 400, "VALIDATION_ERROR", "email is required")
    }

    const storeCore = getStoreCoreService(req)
    const rows = await storeCore.listStoreSettings({ store_id: storeId })
    const row = pickStoreSettingsRow(rows, storeId)
    const metadata = (row?.metadata ?? {}) as Record<string, unknown>
    const result = appendNewsletterSubscriber(metadata, email)

    if (row?.id) {
      await storeCore.updateStoreSettings({
        selector: { id: row.id },
        data: { metadata: result.metadata },
      })
    } else {
      await storeCore.createStoreSettings({
        store_id: storeId,
        metadata: result.metadata,
      })
    }

    if (result.created) {
      await sendNewsletterWelcome({ to: result.email }).catch((err) =>
        console.error("[newsletter] Failed to send welcome email:", err)
      )
    }

    return res.status(200).json({
      store_id: storeId,
      email: result.email,
      created: result.created,
      message: result.created ? "Subscribed to newsletter" : "Already subscribed",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to subscribe"
    return sendError(res, 400, "VALIDATION_ERROR", message)
  }
}
