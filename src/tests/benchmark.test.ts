import { describe, it, expect } from "vitest";
import { toCSV, toJSON } from "../lib/benchmark";

describe("benchmark export", () => {
  it("csv header + row", () => {
    const r = [{ engine: "local" as const, category: "photo", inputW: 32, inputH: 32, outputW: 128, outputH: 128, durationMs: 100, outputBytes: 1000, format: "png", status: "success" as const }];
    const csv = toCSV(r);
    expect(csv.split("\n").length).toBe(2);
    expect(csv).toContain("engine,category");
  });
  it("json valid", () => {
    const r = [{ engine: "cloud" as const, category: "anime", inputW: 1, inputH: 1, outputW: 4, outputH: 4, durationMs: 50, outputBytes: 10, format: "png", status: "success" as const }];
    const j = JSON.parse(toJSON(r));
    expect(j.length).toBe(1);
  });
});