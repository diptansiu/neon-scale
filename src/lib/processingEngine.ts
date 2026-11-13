// Processing engine: job states, transitions, resource tracking.

export type ProcessingState =
  | "idle"
  | "validating"
  | "preparing"
  | "loading_model"
  | "processing"
  | "postprocessing"
  | "completed"
  | "failed"
  | "cancelled";

const ALLOWED: Record<ProcessingState, ProcessingState[]> = {
  idle: ["validating"],
  validating: ["preparing", "failed", "cancelled"],
  preparing: ["loading_model", "processing", "failed", "cancelled"],
  loading_model: ["processing", "failed", "cancelled"],
  processing: ["postprocessing", "completed", "failed", "cancelled"],
  postprocessing: ["completed", "failed", "cancelled"],
  completed: ["idle"],
  failed: ["idle"],
  cancelled: ["idle"],
};

export function canTransition(from: ProcessingState, to: ProcessingState): boolean {
  return ALLOWED[from].includes(to);
}

export interface ProcessingJob {
  id: string;
  state: ProcessingState;
  progress: number; // 0..1
  message: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
  cancelled: boolean;
}

export function createJob(id: string): ProcessingJob {
  return { id, state: "idle", progress: 0, message: "Idle", createdAt: Date.now(), updatedAt: Date.now(), cancelled: false };
}

export function transition(job: ProcessingJob, next: ProcessingState, message?: string): void {
  if (!canTransition(job.state, next)) {
    throw new Error(`Illegal state transition ${job.state} -> ${next}`);
  }
  job.state = next;
  job.updatedAt = Date.now();
  if (message) job.message = message;
  if (next === "cancelled") job.cancelled = true;
}

export function setProgress(job: ProcessingJob, value: number): void {
  const clamped = Math.max(0, Math.min(1, value));
  if (clamped < job.progress) {
    throw new Error(`Progress regression: ${clamped} < ${job.progress}`);
  }
  job.progress = clamped;
  job.updatedAt = Date.now();
}

export function isTerminal(s: ProcessingState): boolean {
  return s === "completed" || s === "failed" || s === "cancelled";
}

// Resource registry for cleanup tracking
export class ResourceRegistry {
  private urls = new Set<string>();
  private bitmaps = new Set<ImageBitmap>();
  private workers = new Set<Worker>();

  trackUrl(url: string) { this.urls.add(url); }
  trackBitmap(b: ImageBitmap) { this.bitmaps.add(b); }
  trackWorker(w: Worker) { this.workers.add(w); }

  revokeUrl(url: string) {
    if (this.urls.has(url)) {
      URL.revokeObjectURL(url);
      this.urls.delete(url);
    }
  }

  closeBitmap(b: ImageBitmap) {
    try { b.close(); } catch {}
    this.bitmaps.delete(b);
  }

  terminateWorker(w: Worker) {
    try { w.terminate(); } catch {}
    this.workers.delete(w);
  }

  cleanupAll() {
    for (const u of this.urls) URL.revokeObjectURL(u);
    this.urls.clear();
    for (const b of this.bitmaps) { try { b.close(); } catch {} }
    this.bitmaps.clear();
    for (const w of this.workers) { try { w.terminate(); } catch {} }
    this.workers.clear();
  }
}

export const resources = new ResourceRegistry();