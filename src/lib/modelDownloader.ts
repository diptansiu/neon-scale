import { openDB } from "idb";
import { getModel } from "./modelRegistry";

const DB_NAME = "neon-scale-models";
const STORE = "models";

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
}

export async function hasCachedModel(id: string, variant: "fp32" | "fp16" = "fp32"): Promise<boolean> {
  const d = await db();
  const key = `${id}:${variant}`;
  const rec = await d.get(STORE, key);
  return !!rec;
}

export async function getCachedModelBuffer(id: string, variant: "fp32" | "fp16" = "fp32"): Promise<ArrayBuffer | null> {
  const d = await db();
  const key = `${id}:${variant}`;
  const rec = (await d.get(STORE, key)) as { buffer: ArrayBuffer } | undefined;
  return rec?.buffer ?? null;
}

export async function deleteCachedModel(id: string, variant?: "fp32" | "fp16") {
  const d = await db();
  if (variant) {
    await d.delete(STORE, `${id}:${variant}`);
  } else {
    await d.delete(STORE, `${id}:fp32`);
    await d.delete(STORE, `${id}:fp16`);
  }
}

export async function sha256Buffer(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface DownloadProgress { loaded: number; total: number; }

export async function downloadModel(
  id: string,
  variant: "fp32" | "fp16" = "fp32",
  onProgress?: (p: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const meta = getModel(id);
  if (!meta) throw new Error("Unknown model");
  const url = variant === "fp16" ? meta.downloadUrlFp16! : meta.downloadUrl;
  const expectedSha = variant === "fp16" ? meta.sha256Fp16! : meta.sha256;
  const expectedSize = variant === "fp16" ? meta.fileSizeFp16! : meta.fileSize;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const total = Number(res.headers.get("content-length")) || expectedSize;
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (signal?.aborted) throw new Error("Cancelled");
    chunks.push(value);
    loaded += value.length;
    onProgress?.({ loaded, total });
  }
  const buf = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.length; }

  if (buf.byteLength !== expectedSize) {
    throw new Error(`Size mismatch: ${buf.byteLength} vs ${expectedSize}`);
  }
  const sha = await sha256Buffer(buf.buffer);
  if (sha.toLowerCase() !== expectedSha.toLowerCase()) {
    throw new Error(`Checksum mismatch: ${sha}`);
  }

  const d = await db();
  await d.put(STORE, { buffer: buf.buffer, sha256: sha, size: buf.byteLength, variant, downloadedAt: Date.now() }, `${id}:${variant}`);

  return buf.buffer;
}

export async function getModelObjectUrl(id: string, variant: "fp32" | "fp16" = "fp32"): Promise<string | null> {
  const buf = await getCachedModelBuffer(id, variant);
  if (!buf) return null;
  const blob = new Blob([buf], { type: "application/octet-stream" });
  return URL.createObjectURL(blob);
}