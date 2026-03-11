/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PERPLEXITY_API_KEY: string
  readonly VITE_PERPLEXITY_MODEL: string
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_GEMINI_MODEL: string
  readonly VITE_FAL_KEY: string
  readonly VITE_ELEVENLABS_API_KEY: string
  readonly VITE_DEEPGRAM_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
