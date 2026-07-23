/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_DEV_SETTINGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injected via `define` in vite.config.js - see that file and
// src/config/buildInfo.ts.
declare const __GIT_BRANCH__: string;
declare const __BUILD_VERSION__: string;
declare const __BUILD_DATE__: string;
