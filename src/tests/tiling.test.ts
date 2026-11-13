import { describe, it, expect } from "vitest";
import { planTiles, outputDimensions, memoryAwareTileSize } from "../lib/tiling";

describe("tiling", () => {
  it("covers full image with no gaps", () => {
    const tiles = planTiles(200, 150, 128, 16);
    // last tile right edge
    const maxX = Math.max(...tiles.map(t => t.x + t.w));
    const maxY = Math.max(...tiles.map(t => t.y + t.h));
    expect(maxX).toBe(200);
    expect(maxY).toBe(150);
  });
  it("handles non-divisible dimensions", () => {
    const tiles = planTiles(100, 100, 32, 4);
    const maxX = Math.max(...tiles.map(t => t.x + t.w));
    const maxY = Math.max(...tiles.map(t => t.y + t.h));
    expect(maxX).toBe(100);
    expect(maxY).toBe(100);
  });
  it("single tile for small image", () => {
    const tiles = planTiles(32, 32, 128, 16);
    expect(tiles.length).toBe(1);
    expect(tiles[0]).toEqual({ x: 0, y: 0, w: 32, h: 32 });
  });
  it("output dimensions 4x", () => {
    expect(outputDimensions(32, 32, 4)).toEqual({ w: 128, h: 128 });
  });
  it("memory-aware tile size reduces for large images", () => {
    expect(memoryAwareTileSize(4000, 4000, 128)).toBe(64);
    expect(memoryAwareTileSize(100, 100, 128)).toBe(128);
  });
  it("throws on invalid input", () => {
    expect(() => planTiles(0, 10, 32, 4)).toThrow();
    expect(() => planTiles(10, 10, 0, 4)).toThrow();
  });
});