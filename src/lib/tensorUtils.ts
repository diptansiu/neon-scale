// Tensor preprocessing/postprocessing for Real-ESRGAN (RGB, NCHW, range [0,1])

export function imageDataToTensor(data: ImageData): Float32Array {
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

export function tensorToImageData(tensor: Float32Array, width: number, height: number, alphaSrc?: Uint8ClampedArray | null): any {
  const out: any = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  const dst = out.data;
  const plane = height * width;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = y * width + x;
      const i = o * 4;
      let r = tensor[0 * plane + o];
      let g = tensor[1 * plane + o];
      let b = tensor[2 * plane + o];
      // clamp
      r = Math.max(0, Math.min(1, r));
      g = Math.max(0, Math.min(1, g));
      b = Math.max(0, Math.min(1, b));
      dst[i] = Math.round(r * 255);
      dst[i + 1] = Math.round(g * 255);
      dst[i + 2] = Math.round(b * 255);
      if (alphaSrc) {
        // nearest-neighbor upsample of alpha handled by caller; here expect already-sized
        dst[i + 3] = alphaSrc[o];
      } else {
        dst[i + 3] = 255;
      }
    }
  }
  return out;
}

export function validateTensorValues(t: Float32Array): boolean {
  for (let i = 0; i < t.length; i++) {
    if (!isFinite(t[i])) return false;
  }
  return true;
}