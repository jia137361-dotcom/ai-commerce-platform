import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const parseOrigins = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

const allowedOrigins = new Set(
  parseOrigins(
    process.env.ADMIN_CORS ||
      "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5175,http://localhost:5175,http://127.0.0.1:5176,http://localhost:5176"
  )
)

/** Handle admin CORS before authentication so browser preflight requests can proceed. */
export function adminCorsMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Vary", "Origin")
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS")
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ??
        "Content-Type, Authorization, X-Store-Id"
    )
    return res.status(204).end()
  }

  return next()
}
