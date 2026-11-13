# Cloud Providers

## Status: BLOCKED

No verified free cloud inference endpoint is currently integrated.

### Reason
- Secure cloud inference requires a backend proxy to protect provider credentials.
- No backend exists in this zero-budget static application.
- Free-tier cloud inference endpoints for super-resolution (Hugging Face free tier, Gradio Spaces) are unreliable, subject to quotas, CORS restrictions, and sleep/wake cycles.
- No end-to-end verified cloud inference has been performed.

### What is implemented
- Hybrid mode selector (Local AI / Cloud AI) with localStorage persistence.
- Cloud model catalogue entry (marked BLOCKED).
- Model information popup (auto-dismiss 4s, manual close, Escape key).
- Privacy consent dialog before first cloud use.
- Cloud connection/queue/blocked status messaging.
- Unified state machine including cloud states (checking_provider, connecting, uploading, queued, retrieving).

### To unblock
1. Deploy a secure backend proxy (e.g., Cloudflare Worker / Vercel function) with provider credentials in env vars.
2. Verify a free-tier endpoint (e.g., Hugging Face Inference API with a free token, or a stable Gradio Space) supports super-resolution and allows the required image sizes.
3. Implement real upload → inference → result retrieval with genuine progress.
4. Run an actual cloud inference test and document results.

### Zero-budget compliance
No paid APIs or services are used. Local mode is fully functional and free. Cloud mode is honestly marked BLOCKED.