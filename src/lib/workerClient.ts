export interface RunRequest {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
}

export class InferenceWorkerClient {
  private worker: Worker;
  private onProgress: (v: number, msg: string) => void;
  private cancelled = false;

  constructor() {
    this.worker = new Worker(new URL("../workers/inference.worker.ts", import.meta.url), { type: "module" });
    this.onProgress = () => {};
  }

  setProgressHandler(h: (v: number, msg: string) => void) { this.onProgress = h; }

  async init(modelUrl: string, providers: string[]): Promise<{ provider: string; fallbackReason: string | null }> {
    return new Promise((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        const m = e.data;
        if (m.type === "init-ok") {
          this.worker.removeEventListener("message", handler);
          resolve({ provider: m.provider, fallbackReason: m.fallbackReason || null });
        } else if (m.type === "error") {
          this.worker.removeEventListener("message", handler);
          reject(new Error(m.message));
        }
      };
      this.worker.addEventListener("message", handler);
      this.worker.postMessage({ type: "init", modelUrl, providers });
    });
  }

  async run(req: RunRequest): Promise<{ rgba: Uint8ClampedArray; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        const m = e.data;
        if (m.type === "progress") {
          this.onProgress(m.value, m.message);
        } else if (m.type === "result") {
          this.worker.removeEventListener("message", handler);
          resolve({ rgba: m.rgba, width: m.width, height: m.height });
        } else if (m.type === "cancelled") {
          this.worker.removeEventListener("message", handler);
          reject(new Error("Cancelled"));
        } else if (m.type === "error") {
          this.worker.removeEventListener("message", handler);
          reject(new Error(m.message));
        }
      };
      this.worker.addEventListener("message", handler);
      this.worker.postMessage(
        { type: "run", rgba: req.rgba, width: req.width, height: req.height, tileSize: req.tileSize, overlap: req.overlap },
        [req.rgba.buffer]
      );
    });
  }

  cancel() {
    this.cancelled = true;
    this.worker.postMessage({ type: "cancel" });
  }

  terminate() {
    this.worker.terminate();
  }
}