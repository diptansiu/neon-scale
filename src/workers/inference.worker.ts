/// <reference lib="webworker" />
import * as ort from "onnxruntime-web/webgpu";

let session: any = null;
let activeProvider = "wasm";
let cancelled = false;

// Configure wasm paths (CDN) - cached by SW
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      cancelled = false;
      const providers = msg.providers as string[];
      // Try providers in order
      let lastErr: any = null;
      for (const p of providers) {
        try {
          session = await ort.InferenceSession.create(msg.modelUrl, {
            executionProviders: [p],
          });
          activeProvider = p;
          lastErr = null;
          break;
        } catch (err: any) {
          lastErr = err;
          session = null;
          console.warn("Provider failed:", p, err?.message || err);
        }
      }
      if (!session) throw lastErr || new Error("Failed to create session");
      postMessage({ type: "init-ok", provider: activeProvider, fallbackReason: lastErr ? String(lastErr?.message || lastErr) : null });
      return;
    }

    if (msg.type === "cancel") {
      cancelled = true;
      postMessage({ type: "cancelled" });
      return;
    }

    if (msg.type === "run") {
      cancelled = false;
      const { rgba, width, height, tileSize, overlap } = msg;
      const scale = 4;
      const outW = width * scale;
      const outH = height * scale;

      // Build alpha channel (RGBA) for output (bilinear upscale)
      const alphaSrc = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) alphaSrc[i] = rgba[i * 4 + 3];

      // Tile geometry
      const tiles: { x: number; y: number; w: number; h: number }[] = [];
      const step = tileSize - overlap;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const w = Math.min(tileSize, width - x);
          const h = Math.min(tileSize, height - y);
          tiles.push({ x, y, w, h });
        }
      }
      // dedupe trailing small tiles by snapping? keep simple

      const outRgba = new Uint8ClampedArray(outW * outH * 4);
      // weight buffer for blending
      const weight = new Float32Array(outW * outH);

      let done = 0;
      const total = tiles.length;

      for (const t of tiles) {
        if (cancelled) {
          postMessage({ type: "cancelled" });
          return;
        }
        // Prepare tile input (with padding? We'll pad to tileSize for model? Model supports dynamic H/W, so run exact tile size)
        const tileData = new ImageData(t.w, t.h);
        for (let yy = 0; yy < t.h; yy++) {
          for (let xx = 0; xx < t.w; xx++) {
            const si = ((t.y + yy) * width + (t.x + xx)) * 4;
            const di = (yy * t.w + xx) * 4;
            tileData.data[di] = rgba[si];
            tileData.data[di + 1] = rgba[si + 1];
            tileData.data[di + 2] = rgba[si + 2];
            tileData.data[di + 3] = 255;
          }
        }
        // tensor
        const tensorData = imageDataToTensor(tileData);
        if (!validateTensor(tensorData)) throw new Error("Invalid tensor values");

        const inputTensor = new (ort as any).Tensor("float32", tensorData, [1, 3, t.h, t.w]);
        const feeds: Record<string, any> = { input: inputTensor };
        const results = await session!.run(feeds);
        const outTensor = results["output"] as any;
        const outData = outTensor.data as Float32Array;
        const oTileW = t.w * scale;
        const oTileH = t.h * scale;
        const oTileX = t.x * scale;
        const oTileY = t.y * scale;

        // Convert tile output to rgba and blend with overlap
        // Build per-pixel weight (triangular / cosine) for overlap blending
        for (let yy = 0; yy < oTileH; yy++) {
          for (let xx = 0; xx < oTileW; xx++) {
            const gx = oTileX + xx;
            const gy = oTileY + yy;
            if (gx >= outW || gy >= outH) continue;
            // source index in tile output tensor (NCHW)
            const srcIdx = (yy * oTileW + xx);
            const plane = oTileH * oTileW;
            let r = outData[0 * plane + srcIdx];
            let g = outData[1 * plane + srcIdx];
            let b = outData[2 * plane + srcIdx];
            r = Math.max(0, Math.min(1, r));
            g = Math.max(0, Math.min(1, g));
            b = Math.max(0, Math.min(1, b));

            // weight based on distance to tile edge (overlap)
            const wx = overlap > 0
              ? Math.min(1, (Math.min(xx, oTileW - 1 - xx) + 1) / (overlap * scale + 1))
              : 1;
            const wy = overlap > 0
              ? Math.min(1, (Math.min(yy, oTileH - 1 - yy) + 1) / (overlap * scale + 1))
              : 1;
            const w = wx * wy;

            const dstIdx = (gy * outW + gx) * 4;
            const prevW = weight[gy * outW + gx];
            const newW = prevW + w;
            // blend
            if (newW > 0) {
              outRgba[dstIdx] = Math.round(((outRgba[dstIdx] * prevW + r * 255 * w) / newW));
              outRgba[dstIdx + 1] = Math.round(((outRgba[dstIdx + 1] * prevW + g * 255 * w) / newW));
              outRgba[dstIdx + 2] = Math.round(((outRgba[dstIdx + 2] * prevW + b * 255 * w) / newW));
            }
            weight[gy * outW + gx] = newW;
          }
        }

        done++;
        postMessage({ type: "progress", value: done / total, message: `Tile ${done}/${total}` });
      }

      // Fill alpha for output via bilinear upscale of alphaSrc
      // Use simple bilinear
      const alphaOut = new Uint8ClampedArray(outW * outH);
      for (let y = 0; y < outH; y++) {
        for (let x = 0; x < outW; x++) {
          const srcX = x / scale;
          const srcY = y / scale;
          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = Math.min(width - 1, x0 + 1);
          const y1 = Math.min(height - 1, y0 + 1);
          const fx = srcX - x0;
          const fy = srcY - y0;
          const a = alphaSrc[y0 * width + x0];
          const b = alphaSrc[y0 * width + x1];
          const c = alphaSrc[y1 * width + x0];
          const d = alphaSrc[y1 * width + x1];
          alphaOut[y * outW + x] = Math.round(a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy);
        }
      }
      for (let i = 0; i < outW * outH; i++) {
        outRgba[i * 4 + 3] = alphaOut[i];
      }

      // If no alpha in source (all 255), keep 255
      // ensure any unprocessed pixels set
      for (let i = 0; i < outW * outH; i++) {
        if (weight[i] === 0) {
          outRgba[i * 4 + 3] = 255;
        }
      }

      postMessage({ type: "result", rgba: outRgba, width: outW, height: outH }, [outRgba.buffer]);
    }
  } catch (err: any) {
    postMessage({ type: "error", message: err?.message || String(err) });
  }
};

function imageDataToTensor(data: ImageData): Float32Array {
  const { width, height } = data;
  const out = new Float32Array(3 * height * width);
  const src = data.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const o = y * width + x;
      out[0 * height * width + o] = src[i] / 255;
      out[1 * height * width + o] = src[i + 1] / 255;
      out[2 * height * width + o] = src[i + 2] / 255;
    }
  }
  return out;
}

function validateTensor(t: Float32Array): boolean {
  for (let i = 0; i < t.length; i++) if (!isFinite(t[i])) return false;
  return true;
}
