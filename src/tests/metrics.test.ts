import { describe, it, expect } from "vitest";
import { psnr, ssim, mse } from "../lib/metrics";

describe("metrics", () => {
  it("psnr infinite for identical", () => {
    const img = { width: 2, height: 2, data: new Uint8ClampedArray([10,20,30,255, 10,20,30,255, 10,20,30,255, 10,20,30,255]) };
    expect(psnr(img, img)).toBe(Infinity);
  });
  it("psnr finite for different", () => {
    const a = { width: 1, height: 1, data: new Uint8ClampedArray([0,0,0,255]) };
    const b = { width: 1, height: 1, data: new Uint8ClampedArray([255,255,255,255]) };
    const p = psnr(a, b);
    expect(Number.isFinite(p)).toBe(true);
    expect(p).toBeGreaterThanOrEqual(0);
  });
  it("ssim 1 for identical", () => {
    const img = { width: 8, height: 8, data: new Uint8ClampedArray(8*8*4).fill(128) };
    // fill alpha
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    expect(ssim(img, img)).toBeCloseTo(1, 5);
  });
  it("ssim dimension mismatch throws", () => {
    const a = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
    const b = { width: 3, height: 2, data: new Uint8ClampedArray(24) };
    expect(() => ssim(a, b)).toThrow();
  });
  it("mse zero for identical", () => {
    const img = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(5) };
    expect(mse(img, img)).toBe(0);
  });
});