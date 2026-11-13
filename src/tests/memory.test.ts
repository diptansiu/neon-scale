import { describe, it, expect } from "vitest";
import { planTiles, outputDimensions, memoryAwareTileSize } from "../lib/tiling";
import { memoryPreflight, estimateMemory } from "../lib/imageUtils";

describe("memory lifecycle", () => {
  it("planTiles covers non-square image", () => {
    const tiles = planTiles(129, 77, 64, 8);
    const maxX = Math.max(...tiles.map(t => t.x + t.w));
    const maxY = Math.max(...tiles.map(t => t.y + t.h));
    expect(maxX).toBe(129);
    expect(maxY).toBe(77);
    expect(tiles.length).toBeGreaterThan(1);
  });

  it("outputDimensions 4x", () => {
    expect(outputDimensions(32, 32, 4)).toEqual({ w: 128, h: 128 });
    expect(outputDimensions(100, 100, 4)).toEqual({ w: 400, h: 400 });
  });

  it("memoryAwareTileSize caps large images", () => {
    expect(memoryAwareTileSize(4000, 4000, 128)).toBe(64);
    expect(memoryAwareTileSize(100, 100, 128)).toBe(128);
  });

  it("estimateMemory returns finite positive", () => {
    expect(estimateMemory(32, 32)).toBeGreaterThan(0);
    expect(Number.isFinite(estimateMemory(32, 32))).toBe(true);
  });

  it("memoryPreflight rejects huge images", () => {
    const pf = memoryPreflight(9000, 9000);
    expect(pf.ok).toBe(false);
    expect(typeof pf.message).toBe("string");
  });

  it("memoryPreflight ok for normal images", () => {
    const pf = memoryPreflight(32, 32);
    expect(pf.ok).toBe(true);
  });
});