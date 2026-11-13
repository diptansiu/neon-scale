# Decisions

- Vite + React + TypeScript for UI.
- ONNX Runtime Web 1.20.1; webgpu bundle for WebGPU support.
- Real-ESRGAN x4plus from skillsafe-ai (BSD-3-Clause weights); verified via manifest sha256.
- fp32 default; fp16 variant available.
- Tiling in worker to avoid main-thread blocking and memory blowup.
- Alpha upscaled bilinearly (model is RGB).
- Service worker manual (vite-plugin-pwa dependency chain broken in this env).
- No backend; static hosting.