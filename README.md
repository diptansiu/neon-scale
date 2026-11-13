# NEON//SCALE

Browser-based, local-first AI image upscaler with optional cloud inference. Uses ONNX Runtime Web with Real-ESRGAN x4plus (RRDBNet, 23 blocks) for genuine 4x super-resolution locally, and a Hugging Face ZeroGPU Space for optional cloud upscaling. No paid APIs, no subscriptions, no credit card required.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. First upscale downloads the model (~67MB fp32) and caches it in IndexedDB.

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

## Processing modes

- **Local AI (default):** Real-ESRGAN x4plus runs entirely in your browser via ONNX Runtime Web (WebGPU when available, WASM fallback). Fully private — nothing leaves your device.
- **Cloud AI:** Optional remote inference via a Hugging Face ZeroGPU Space (RealESRGAN_x4plus). Requires explicit consent before the first upload; images are sent to a remote provider. Free-tier quota applies (~5 min/day).

## Features

- Drag-and-drop / file picker upload
- Real AI inference (ONNX Runtime Web), WebGPU with WASM fallback
- Optional cloud inference (ZeroGPU), independent of local mode
- Tiled processing with overlap blending for large images
- Before/after comparison slider, zoom, fit, 100%, side-by-side
- Export PNG / JPEG (matte)
- Model caching in IndexedDB with SHA-256 verification
- Service worker + PWA for offline after caching
- Cancel, progress reporting, stale-job protection
- PSNR/SSIM/MSE metrics and benchmark CSV/JSON export
- Privacy consent before any cloud upload

## Deployment

Repository: https://github.com/diptansiu/neon-scale
Hosting: GitHub Pages (project site at https://diptansiu.github.io/neon-scale/)
See DEPLOYMENT.md. COOP/COEP headers recommended for SharedArrayBuffer.

## Memory & performance

- Object URLs are revoked when images are replaced.
- Image validation: max 25 MB file size, max 8192 px dimension.
- Memory-aware tile sizing (64/96/128 px based on pixel count).
- Local engine uses WebGPU when available, WASM fallback otherwise.

