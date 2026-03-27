/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_LIVEKIT_URL: string;
  /** Google Maps JavaScript API key — required for Map Display panel */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  /** Google Maps Map ID — use DEMO_MAP_ID for local dev, real ID for production */
  readonly VITE_GOOGLE_MAP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
