export interface ImageInfo {
  width: number;
  height: number;
  hasAlpha: boolean;
}

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DIM = 8192;

export async function decodeImage(file: File): Promise<{ bitmap: ImageBitmap; info: ImageInfo }> {
  if (!file.type.startsWith("image/")) throw new Error("Unsupported file type");
  if (file.size > MAX_FILE_BYTES) throw new Error("File too large (max 25MB)");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width > MAX_DIM || bitmap.height > MAX_DIM) {
    bitmap.close();
    throw new Error(`Image too large (${bitmap.width}x${bitmap.height})`);
  }
  const hasAlpha = file.type === "image/png" || file.type === "image/webp";
  return { bitmap, info: { width: bitmap.width, height: bitmap.height, hasAlpha } };
}

export function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

export function imageDataToBlob(imageData: ImageData, type: string, quality?: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function estimateMemory(width: number, height: number): number {
  // bytes for RGBA + a few buffers
  return width * height * 4 * 4;
}

export function memoryPreflight(width: number, height: number): { ok: boolean; message: string } {
  const mem = estimateMemory(width, height);
  const limit = 512 * 1024 * 1024; // 512MB heuristic
  if (mem > limit) {
    return { ok: false, message: `Image too large for safe processing (~${Math.round(mem / 1024 / 1024)}MB estimated).` };
  }
  if (mem > limit / 2) {
    return { ok: true, message: `Large image (~${Math.round(mem / 1024 / 1024)}MB). Processing may be slow.` };
  }
  return { ok: true, message: "" };
}