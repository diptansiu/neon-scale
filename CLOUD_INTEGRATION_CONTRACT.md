# Cloud Integration Contract (NEON//SCALE)

## Service
- Location: `cloud-space/` (Hugging Face Gradio ZeroGPU Space, not yet deployed).
- Model: Real-ESRGAN x4plus (RRDBNet, 23 blocks), 4x super-resolution.
- License: BSD-3-Clause (weights).

## Actual API (verified 2026-11-13)
- Base URL: `https://dipumeh-neon-scale-cloud.hf.space`
- Gradio 5 API prefix: `/gradio_api`
- Endpoint name: `/predict`
- Submit: POST `/gradio_api/call/predict` body `{ data: [FileData] }` → `{ event_id }`
- Result: GET `/gradio_api/call/predict/<event_id>` → SSE stream, `event: complete` with data array containing FileData with `url`
- Input: FileData object (path, url, orig_name, mime_type, is_stream, meta)
- Output: FileData object with `url` pointing to result image
- Hardware: ZeroGPU (zero-a10g)
- Verified inference: 64x64 red PNG → 256x256 output (4x), content-type image/webp

## Frontend integration points (when unblocked)
- `src/lib/modelRegistry.ts`: `CLOUD_MODELS` entry status → "available", set endpoint.
- `src/App.tsx`: cloud branch in `run()` — upload image, poll queue, retrieve result, validate dimensions (4x).
- Reuse existing state machine: checking_provider, connecting, uploading, queued, processing, retrieving, completed/failed.
- Privacy consent already implemented (`showConsent`).
- No automatic mode switching.

## Security
- No tokens in frontend.
- All credentials (if any) server-side in the Space.
- Input validation in Space (size, dimensions, MIME).
- No image persistence after processing.