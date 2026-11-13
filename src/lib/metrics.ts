// Image quality metrics: PSNR and SSIM (luminance, single-channel or RGB-averaged).

export interface ImageLike { width: number; height: number; data: Uint8ClampedArray | number[]; }

function toGray(img: ImageLike): Float32Array {
  const { width, height, data } = img;
  const out = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    out[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return out;
}

export function mse(a: ImageLike, b: ImageLike): number {
  if (a.width !== b.width || a.height !== b.height) throw new Error("Dimension mismatch");
  const ga = toGray(a), gb = toGray(b);
  let s = 0;
  for (let i = 0; i < ga.length; i++) {
    const d = ga[i] - gb[i];
    s += d * d;
  }
  return s / ga.length;
}

export function psnr(a: ImageLike, b: ImageLike, maxVal = 255): number {
  const m = mse(a, b);
  if (m === 0) return Infinity;
  return 10 * Math.log10((maxVal * maxVal) / m);
}

// Simplified SSIM (Wang et al.) on grayscale with 8x8 non-overlapping? Use sliding 11x11 Gaussian-ish via uniform window for simplicity.
export function ssim(a: ImageLike, b: ImageLike): number {
  if (a.width !== b.width || a.height !== b.height) throw new Error("Dimension mismatch");
  const ga = toGray(a), gb = toGray(b);
  const w = a.width, h = a.height;
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  const win = 8;
  let ssimSum = 0, count = 0;
  for (let y = 0; y + win <= h; y += win) {
    for (let x = 0; x + win <= w; x += win) {
      // compute means
      let ma = 0, mb = 0, sa = 0, sb = 0, sab = 0;
      const n = win * win;
      for (let yy = 0; yy < win; yy++) {
        for (let xx = 0; xx < win; xx++) {
          const idx = (y + yy) * w + (x + xx);
          const va = ga[idx], vb = gb[idx];
          ma += va; mb += vb;
        }
      }
      ma /= n; mb /= n;
      for (let yy = 0; yy < win; yy++) {
        for (let xx = 0; xx < win; xx++) {
          const idx = (y + yy) * w + (x + xx);
          const va = ga[idx] - ma, vb = gb[idx] - mb;
          sa += va * va; sb += vb * vb; sab += va * vb;
        }
      }
      sa /= n - 1; sb /= n - 1; sab /= n - 1;
      const saSqrt = Math.sqrt(Math.max(sa, 0));
      const sbSqrt = Math.sqrt(Math.max(sb, 0));
      const num = (2 * ma * mb + C1) * (2 * sab + C2);
      const den = (ma * ma + mb * mb + C1) * (sa + sb + C2);
      ssimSum += num / den;
      count++;
    }
  }
  if (count === 0) return 1;
  return ssimSum / count;
}