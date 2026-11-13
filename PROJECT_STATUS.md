# Project Status — NEON//SCALE v1.0

## Verified baseline (current repository)

- React + TypeScript + Vite frontend.
- Local Real-ESRGAN 4× inference via ONNX Runtime Web (WebGPU preferred, WASM fallback).
- Web Workers, tiled inference with overlap blending.
- Model download, SHA-256 verification, IndexedDB caching.
- Cloud AI via Hugging Face ZeroGPU Space (dipumeh-neon-scale-cloud.hf.space), RealESRGAN_x4plus.
- Cloud privacy consent dialog; cloud mode independent of local mode.
- Image comparison (slider, zoom, fit, 100%, side-by-side).
- PSNR/SSIM/MSE metrics; benchmark runner with CSV/JSON export.
- Image validation (25 MB file, 8192 px dimension), memory preflight, object-URL lifecycle.
- PWA: service worker + manifest + offline caching.
- Dark NEON//SCALE technical interface (Base44-inspired).

## Verified test results

- `npm test`: 7 test files, 27 tests — all PASS.
- `npm run build`: succeeds (production).
- `tsc -b` / typecheck: passes (part of build).

## Verified inference

- Local AI: 32×32 input → 128×128 output (4×), WebGPU provider, SHA-256 model verified, cached in IndexedDB.
- Cloud AI: 64×64 red PNG → 256×256 output (4×) on Hugging Face ZeroGPU (zero-a10g), content-type image/webp, queue + SSE polling verified.

## Cloud model

- Space: https://dipumeh-neon-scale-cloud.hf.space
- Endpoint: POST /gradio_api/call/predict → {event_id}; GET /gradio_api/call/predict/{id} → SSE complete with result URL.
- Hardware: ZeroGPU (zero-a10g), free tier (5 min/day for free account).
- Status: VERIFIED (real inference performed). Quota-protected; no paid fallback.

## Deployment

- Repository: https://github.com/diptansiu/neon-scale (public)
- Hosting: GitHub Pages (project site, URL https://diptansiu.github.io/neon-scale/)
- Build: GitHub Actions (`npm ci` → `npm run build` → `actions/deploy-pages@v4`)
- Vite base: `/neon-scale/` in production, `/` in dev.
- SPA fallback: public/404.html redirects to index.html.
- Pages deployment: BLOCKED on one-time manual step — enable Pages in repo Settings → Pages → Source: GitHub Actions. The CLI/API cannot create a first Pages site.
- Workflow builds successfully; deploy step blocked until Pages is enabled once.

## Stage status

| Stage | Status |
|---|---|
| 0 Foundation/Audit | VERIFIED |
| 1 Processing engine | VERIFIED |
| 2 Real-ESRGAN inference | VERIFIED (browser test: 32x32 -> 128x128, WebGPU) |
| 3 Production hardening | VERIFIED (timeouts, quota handling, stale-job guard, image validation) |
| 4 Image quality benchmarking | VERIFIED (PSNR/SSIM/MSE, benchmark export, comparison controls) |
| 5 Performance engineering | VERIFIED (memory preflight, object-URL lifecycle, tiling, 27 tests) |
| 6 Release readiness | IN PROGRESS (build+tests pass; deploy blocked on Pages UI enablement) |

## Release-blocking item

- GitHub Pages first-time enablement must be done once in the repo UI (Settings → Pages → Source: GitHub Actions → branch: master). The REST API cannot create a first Pages site. After that, every push to master auto-builds and deploys.
