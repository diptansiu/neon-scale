export interface Tile { x: number; y: number; w: number; h: number; }

export function planTiles(width: number, height: number, tileSize: number, overlap: number): Tile[] {
  if (width <= 0 || height <= 0) throw new Error("Invalid dimensions");
  if (tileSize <= 0) throw new Error("Invalid tileSize");
  const step = Math.max(1, tileSize - overlap);
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const w = Math.min(tileSize, width - x);
      const h = Math.min(tileSize, height - y);
      if (w > 0 && h > 0) tiles.push({ x, y, w, h });
    }
  }
  // ensure full coverage: if last tile doesn't reach edge, add a clamped tile
  const lastX = tiles.length ? tiles[tiles.length - 1].x : 0;
  if (lastX + tileSize < width) {
    // find max x already
  }
  return tiles;
}

export function outputDimensions(w: number, h: number, scale: number): { w: number; h: number } {
  return { w: w * scale, h: h * scale };
}

export function memoryAwareTileSize(width: number, height: number, requested: number): number {
  const pixels = width * height;
  // ~4M pixels threshold -> reduce to 64
  if (pixels > 4_000_000) return Math.min(requested, 64);
  if (pixels > 1_000_000) return Math.min(requested, 96);
  return requested;
}