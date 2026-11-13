# Known Limitations

- Only one validated model (Real-ESRGAN x4plus). Additional models documented as planned.
- WebGPU may fail on some devices; WASM fallback used.
- iOS uses WASM only (not tested on physical device).
- Alpha upscaled bilinearly, not by AI.
- No ICC profile preservation.
- EXIF orientation not explicitly handled.
- Large images depend on device memory; tile size adjustable.
- Cloud AI mode VERIFIED via Hugging Face ZeroGPU (DipuMeh/neon-scale-cloud). Free tier quota: 5 min/day (free account), 2 min/day (unauthenticated).
- Offline requires prior caching of app + model.