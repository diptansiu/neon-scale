# Testing Report

## Unit tests (vitest)

- processingEngine: state transitions, illegal transitions, progress monotonic (3)
- modelRegistry: model presence, metadata validation, sha256 format (3)
- tensorUtils: roundtrip, finite validation (2)

Result: 3 files, 8 tests, all pass.

## Manual browser test

- Opened app in OpenCode browser (Electron/Chromium).
- Uploaded 32x32 PNG via drag-drop.
- Ran upscale: output 128x128 (4x), provider WebGPU, no console errors.
- Model downloaded and cached in IndexedDB; SHA-256 verified at download.

## Build

- `npm run build` succeeds (Vite production build).