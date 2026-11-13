# Changelog — NEON//SCALE

## [v1.0] — 2026-11-13

### Added
- Local AI image upscaling with Real-ESRGAN x4plus (RRDBNet, 23 blocks) via ONNX Runtime Web.
- WebGPU execution with WASM fallback; runtime capability detection.
- Web Worker–based inference with tiled processing and overlap blending.
- Model download with SHA-256 verification and IndexedDB caching.
- Image validation: max 25 MB file size, max 8192 px dimension; memory preflight.
- Before/after inspection bay: comparison slider, zoom, fit-to-screen, 100%, side-by-side.
- Export PNG (lossless) and JPEG (quality + matte color).
- Optional Cloud AI mode via Hugging Face ZeroGPU Space (RealESRGAN_x4plus, 4×).
- Privacy consent dialog before first cloud upload.
- Technical status readout (engine, worker, WASM, WebGPU, model, provider, status, scale).
- PSNR, SSIM, and MSE image-quality metrics.
- Benchmark runner with CSV and JSON export.
- Service worker + PWA manifest for offline use after caching.
- Dark NEON//SCALE technical interface (Base44-inspired): cyan/violet accents, Space Grotesk + IBM Plex Mono.

### Changed
- Vite base path: `/neon-scale/` for GitHub Pages production, `/` for dev.
- Added GitHub Actions deploy workflow and SPA 404 fallback.

### License note
No project license has been selected yet. A licensing decision is pending. Real-ESRGAN model weights are BSD-3-Clause (Xintao Wang).
