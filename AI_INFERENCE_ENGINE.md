# AI Inference Engine

- Runtime: ONNX Runtime Web.
- Model: Real-ESRGAN x4plus, RRDBNet 23 blocks, scale 4.
- Input: float32 NCHW RGB, range [0,1] (divide by 255).
- Output: float32 NCHW RGB, range [0,1].
- Tensor names: input / output.
- Tiling: configurable tile size + overlap, per-tile inference, weighted blend.
- Providers: WebGPU (preferred), WASM fallback.
- Progress: per-tile, monotonic.
- Cancellation: worker checks cancelled flag between tiles.