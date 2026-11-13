# Architecture

UI (React) -> App controller -> InferenceWorkerClient -> Web Worker -> ONNX Runtime Web (WebGPU/WASM).

Modules:
- `src/lib/processingEngine.ts`: states, transitions, progress, resource registry.
- `src/lib/modelRegistry.ts`: model metadata + validation.
- `src/lib/modelDownloader.ts`: fetch, SHA-256, size check, IndexedDB.
- `src/lib/workerClient.ts`: worker lifecycle, messaging.
- `src/workers/inference.worker.ts`: ONNX session, tiling, blending, alpha.
- `src/lib/tensorUtils.ts`: NCHW RGB float32 conversion.
- `src/lib/imageUtils.ts`: decode/encode/export.
- `src/lib/capabilities.ts`: runtime feature detection.

Tiling: configurable tile size + overlap, per-tile inference, weighted blend, bilinear alpha upscale. Output dimensions exactly 4x input.