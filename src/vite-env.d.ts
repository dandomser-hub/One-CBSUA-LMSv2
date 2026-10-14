/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_PASSWORD?: string
  readonly VITE_ENABLE_DEMO_LOGIN?: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
