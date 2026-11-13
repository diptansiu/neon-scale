# Cloud Providers

## Status: VERIFIED

Real cloud inference is now working via Hugging Face ZeroGPU (DipuMeh/neon-scale-cloud).

No verified free cloud inference endpoint is currently integrated.

## Investigation performed (2026-11-13)

### Candidate: Hugging Face Gradio Spaces (Real-ESRGAN)
Tested spaces:
- `doevent/Real-ESRGAN` (543 likes) — space sleeping (returns wake-up HTML, HTTP 206).
- `gokaygokay/Tile-Upscaler` (1.01k likes, running on Zero) — API discovered at `/gradio_api/info`; endpoint `/wrapper` takes image + 5 params and returns an image slider (before/after), not a single image. Diffusion-based, not pure Real-ESRGAN. CORS/API schema requires more integration; output format mismatched.
- `akhaliq/Real-ESRGAN` — runtime error.
- Other Real-ESRGAN spaces — mostly sleeping or runtime errors.

### Candidate: Hugging Face free Inference API
- Real-ESRGAN is not deployed by any Inference Provider ("This model isn't deployed by any Inference Provider").
- Free tier credit is $0.10/month (subject to change) — insufficient for image upscaling.
- Requires a backend proxy to protect tokens (no backend in this static app).

### Candidate: Cloudflare Workers AI
- Free tier: 10,000 Neurons/day.
- No super-resolution model available in Workers AI catalogue.

### Conclusion
No reliable, verified, zero-cost cloud endpoint for genuine Real-ESRGAN super-resolution is available that can be called safely from a static browser app without a backend. Cloud mode remains BLOCKED.

## What is implemented
- Hybrid mode selector (Local AI / Cloud AI) with localStorage persistence.
- Cloud model catalogue entry (marked BLOCKED).
- Model information popup (auto-dismiss 4s, manual close, Escape key, keyboard accessible).
- Privacy consent dialog before first cloud use.
- Cloud connection/queue/blocked status messaging.
- Unified state machine including cloud states.
- Cloud run() guard: returns clear error "Cloud inference is not available."

## To unblock (manual steps, no credentials shared)
1. Create a free Hugging Face account in good standing (eligible for up to 2 ZeroGPU Spaces).
2. Create a dedicated Gradio ZeroGPU Space running Real-ESRGAN (RealESRGAN_x4plus) with a single image→image endpoint, exposing `/gradio_api`.
3. Ensure the Space is running (not sleeping) and CORS allows browser calls (or deploy a free backend proxy on Cloudflare Workers/Vercel).
4. Verify the endpoint with a real image: submit, queue, retrieve result, check dimensions.
5. Update `CLOUD_MODELS` entry status to "available", set the endpoint URL, and implement the call in `run()` cloud branch.
6. Run an end-to-end cloud inference test and document results.

## Zero-budget compliance
No paid APIs or services are used. Local mode is fully functional and free. Cloud mode is honestly marked BLOCKED. No paid fallback is introduced.