/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_CURRENCY_CODE: string;
  readonly VITE_DEMO_LOGIN_ENABLED: string;
  readonly VITE_DEMO_AUTO_LOGIN_ENABLED: string;
  readonly VITE_DEMO_ADMIN_EMAIL: string;
  readonly VITE_DEMO_ADMIN_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}