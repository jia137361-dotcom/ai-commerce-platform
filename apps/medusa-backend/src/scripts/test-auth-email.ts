import { loadEnv } from "@medusajs/framework/utils"
import { randomInt } from "node:crypto"
import { Resend } from "resend"
import { sendBuyerEmailVerificationCode, sendBuyerPasswordResetCode } from "../lib/email"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

async function main() {
  const to = process.env.TEST_EMAIL_TO?.trim()
  if (!to) {
    throw new Error("TEST_EMAIL_TO is required for auth email smoke testing.")
  }
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is required for auth email smoke testing.")
  }
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is required for auth email smoke testing.")
  }

  process.env.AUTH_EMAIL_DELIVERY_MODE = "resend"
  process.env.AUTH_DEV_CODE_ENABLED = "false"

  const kind = process.env.TEST_EMAIL_KIND?.trim() === "password_reset"
    ? "password_reset"
    : "email_verification"
  const code = String(randomInt(100000, 1000000))
  const result = kind === "password_reset"
    ? await sendBuyerPasswordResetCode({
      to,
      code,
      expiresInMinutes: 30,
      idempotencyKey: `auth-email-smoke-reset-${Date.now()}`,
    })
    : await sendBuyerEmailVerificationCode({
      to,
      code,
      expiresInMinutes: 15,
      idempotencyKey: `auth-email-smoke-verify-${Date.now()}`,
    })

  if (!result.success) {
    throw new Error("Auth email smoke was rejected by the provider.")
  }

  console.log("Auth email smoke accepted by provider", { kind, messageId: result.id ?? "unknown" })

  if (result.id) {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const status = await new Resend(process.env.RESEND_API_KEY).emails.get(result.id)
    if (status.error) {
      const record = status.error as Record<string, unknown>
      console.log("Auth email smoke status unavailable", {
        messageId: result.id,
        error: {
          name: typeof record.name === "string" ? record.name : "unknown",
          statusCode: typeof record.statusCode === "number" ? record.statusCode : undefined,
          message: typeof record.message === "string" ? record.message.replace(/\s+/g, " ").slice(0, 180) : "unknown",
        },
      })
    } else {
      console.log("Auth email smoke provider status", {
        messageId: status.data?.id ?? result.id,
        lastEvent: status.data?.last_event ?? "unknown",
        from: status.data?.from ?? "unknown",
        toCount: status.data?.to?.length ?? 0,
      })
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Auth email smoke failed.")
  process.exitCode = 1
})
