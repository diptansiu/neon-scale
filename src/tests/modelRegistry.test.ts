import { describe, it, expect } from "vitest";
import { MODEL_REGISTRY, validateModelMeta } from "../lib/modelRegistry";

describe("model registry", () => {
  it("has realesrgan model", () => {
    expect(MODEL_REGISTRY.find((m) => m.id === "realesrgan-x4plus")).toBeTruthy();
  });
  it("validates metadata", () => {
    for (const m of MODEL_REGISTRY) {
      expect(validateModelMeta(m)).toEqual([]);
    }
  });
  it("sha256 format", () => {
    const m = MODEL_REGISTRY[0];
    expect(m.sha256).toMatch(/^[0-9a-f]{64}$/i);
  });
});