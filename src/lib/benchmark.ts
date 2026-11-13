export interface BenchmarkResult {
  engine: "local" | "cloud";
  category: string;
  inputW: number;
  inputH: number;
  outputW: number;
  outputH: number;
  durationMs: number;
  outputBytes: number;
  format: string;
  psnr?: number;
  ssim?: number;
  status: "success" | "failed" | "skipped";
  note?: string;
}

export function toCSV(results: BenchmarkResult[]): string {
  const header = ["engine","category","inputW","inputH","outputW","outputH","durationMs","outputBytes","format","psnr","ssim","status","note"];
  const rows = results.map(r => header.map(h => {
    const v = (r as any)[h];
    if (v === undefined || v === null) return "";
    return String(v).replace(/,/g, ";");
  }).join(","));
  return [header.join(","), ...rows].join("\n");
}

export function toJSON(results: BenchmarkResult[]): string {
  return JSON.stringify(results, null, 2);
}