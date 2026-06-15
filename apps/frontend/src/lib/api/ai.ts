import { config } from "../config"

export const aiWorkerHealth = async () => {
  const response = await fetch(`${config.aiWorkerBaseUrl}/health`)
  const text = await response.text()
  return {
    ok: response.ok,
    status: response.status,
    body: text ? JSON.parse(text) : null,
  }
}
