/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MEDUSA_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
