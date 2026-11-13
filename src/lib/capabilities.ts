export interface Capabilities {
  webgpu: boolean;
  wasm: boolean;
  offscreenCanvas: boolean;
  serviceWorker: boolean;
  indexedDB: boolean;
  webWorker: boolean;
  isIOS: boolean;
  isSafari: boolean;
}

export async function detectCapabilities(): Promise<Capabilities> {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  let webgpu = false;
  try {
    // @ts-ignore
    if (navigator.gpu) {
      // @ts-ignore
      const adapter = await navigator.gpu.requestAdapter();
      webgpu = !!adapter;
    }
  } catch {
    webgpu = false;
  }
  return {
    webgpu,
    wasm: typeof WebAssembly !== "undefined",
    offscreenCanvas: typeof OffscreenCanvas !== "undefined",
    serviceWorker: "serviceWorker" in navigator,
    indexedDB: "indexedDB" in window,
    webWorker: typeof Worker !== "undefined",
    isIOS,
    isSafari,
  };
}

export function preferredProviders(caps: Capabilities): string[] {
  // iOS Safari/Chrome: WASM only
  if (caps.isIOS) return ["wasm"];
  if (caps.webgpu) return ["webgpu", "wasm"];
  return ["wasm"];
}