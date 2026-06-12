import { lazy } from "react";

const CHUNK_RELOAD_KEY = "surmaderas:chunk-reload-at";
const CHUNK_RELOAD_WINDOW_MS = 10000;

function isChunkLoadError(error) {
  const message = String(error?.message || error || "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(message);
}

function canReloadForChunkError() {
  if (typeof window === "undefined") return false;

  const lastReload = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  const now = Date.now();
  if (now - lastReload < CHUNK_RELOAD_WINDOW_MS) return false;

  window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
  return true;
}

export function lazyWithReload(importer) {
  return lazy(() => (
    importer().catch((error) => {
      if (isChunkLoadError(error) && canReloadForChunkError()) {
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    })
  ));
}
