# Cloud Integration Contract (NEON//SCALE)

## Service
- Location: `cloud-space/` (Hugging Face Gradio ZeroGPU Space, not yet deployed).
- Model: Real-ESRGAN x4plus (RRDBNet, 23 blocks), 4x super-resolution.
- License: BSD-3-Clause (weights).

## Expected API (to be discovered after deployment)
- Base URL: `https://<owner>-<space>.hf.space`
- Gradio 5 API prefix: `/gradio_api`
- Endpoint name: TBD (discover via `/gradio_api/info`)
- Input: image (file upload or base64 URL)
- Output: image (PNG/JPEG)
- Queue: `/gradio_api/call/<endpoint>` (async) or `/gradio_api/<endpoint>` (sync)
- Progress: SSE events (if provided by Gradio)

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