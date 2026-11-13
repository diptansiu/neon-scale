import { describe, it, expect } from "vitest";
import { createJob, transition, setProgress, canTransition } from "../lib/processingEngine";

describe("processing engine", () => {
  it("allows valid transitions", () => {
    const job = createJob("1");
    transition(job, "validating");
    expect(job.state).toBe("validating");
  });
  it("rejects illegal transitions", () => {
    const job = createJob("2");
    expect(() => transition(job, "completed")).toThrow();
  });
  it("progress monotonic", () => {
    const job = createJob("3");
    transition(job, "validating");
    transition(job, "preparing");
    setProgress(job, 0.5);
    expect(() => setProgress(job, 0.4)).toThrow();
    setProgress(job, 1);
    expect(job.progress).toBe(1);
  });
});