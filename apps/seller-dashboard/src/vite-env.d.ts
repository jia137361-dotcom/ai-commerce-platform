/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MEDUSA_URL: string
  readonly VITE_STORE_ID: string
  readonly VITE_STOREFRONT_URL?: string
  readonly VITE_AI_WORKER_PUBLIC_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "*.css" {
  const content: string
  export default content
}
