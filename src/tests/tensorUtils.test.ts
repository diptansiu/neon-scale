import { describe, it, expect } from "vitest";
import { imageDataToTensor, tensorToImageData, validateTensorValues } from "../lib/tensorUtils";

describe("tensor utils", () => {
  it("roundtrips dimensions", () => {
    const data: any = { width: 4, height: 4, data: new Uint8ClampedArray(4*4*4) };
    for (let i = 0; i < data.data.length; i += 4) { data.data[i] = 100; data.data[i+1]=150; data.data[i+2]=200; data.data[i+3]=255; }
    const t = imageDataToTensor(data);
    expect(t.length).toBe(3*4*4);
    const out = tensorToImageData(t, 4, 4);
    expect(out.width).toBe(4);
    expect(out.data[0]).toBe(100);
  });
  it("validates finite", () => {
    const t = new Float32Array([1,2,3]);
    expect(validateTensorValues(t)).toBe(true);
    const t2 = new Float32Array([NaN]);
    expect(validateTensorValues(t2)).toBe(false);
  });
});