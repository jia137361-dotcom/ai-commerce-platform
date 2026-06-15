export type AppConfig = {
  medusaBaseUrl: string
  aiWorkerBaseUrl: string
  defaultStoreId: string
  testStoreId: string
  publishableApiKey: string
  demoMockAi: boolean
}

const readEnv = (key: string, fallback = "") =>
  (import.meta.env[key] as string | undefined)?.trim() || fallback

export const config: AppConfig = {
  medusaBaseUrl: readEnv("VITE_MEDUSA_BASE_URL", "http://127.0.0.1:9000"),
  aiWorkerBaseUrl: readEnv("VITE_AI_WORKER_BASE_URL", "http://127.0.0.1:8001"),
  defaultStoreId: readEnv("VITE_DEFAULT_STORE_ID", "default_store"),
  testStoreId: readEnv("VITE_TEST_STORE_ID", "test_store"),
  publishableApiKey: readEnv("VITE_PUBLISHABLE_API_KEY"),
  demoMockAi: readEnv("VITE_DEMO_MOCK_AI", "false") === "true",
}

export const stores = [
  { id: config.defaultStoreId, name: "CitiGoo Default Store" },
  { id: config.testStoreId, name: "CitiGoo Test Store" },
]
