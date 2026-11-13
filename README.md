# NEON-SCALE

Browser-based, local-first AI image upscaler. Uses ONNX Runtime Web with Real-ESRGAN x4plus (RRDBNet, 23 blocks) for genuine 4x super-resolution. No paid APIs, no uploads.

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

## Features

- Drag-and-drop / file picker upload
- Real AI inference (ONNX Runtime Web), WebGPU with WASM fallback
- Tiled processing with overlap blending for large images
- Before/after comparison slider, zoom via browser
- Export PNG / JPEG (matte)
- Model caching in IndexedDB with SHA-256 verification
- Service worker + PWA for offline after caching
- Cancel, progress reporting

## Deployment

Static hosting (GitHub Pages / Cloudflare Pages / Netlify). See DEPLOYMENT.md. COOP/COEP headers recommended for SharedArrayBuffer.

## Memory & performance

- Object URLs are revoked when images are replaced.
- Image validation: max 25 MB file size, max 8192 px dimension.
- Memory-aware tile sizing (64/96/128 px based on pixel count).
- Local engine uses WebGPU when available, WASM fallback otherwise.
