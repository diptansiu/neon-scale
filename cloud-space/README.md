---
title: Neon Scale Cloud
emoji: ⚡
colorFrom: gray
colorTo: gray
sdk: gradio
sdk_version: "5.49.1"
app_file: app.py
python_version: "3.10"
pinned: false
---

# NEON//SCALE Cloud Upscaler (ZeroGPU)

Gradio Space running Real-ESRGAN x4plus (RRDBNet, 23 blocks) for 4x super-resolution on Hugging Face ZeroGPU.

## Deploy

1. Create a Hugging Face account (free, in good standing for ZeroGPU eligibility).
2. Create a new Space: SDK = Gradio, Hardware = ZeroGPU.
3. Upload the contents of `cloud-space/` (app.py, requirements.txt, README.md).
4. Wait for the build to complete.
5. Open the Space URL and test with a small image.
6. Click "Use via API" in the footer to discover the exact endpoint and schema.

## API

Gradio 5 exposes endpoints under `/gradio_api`. The function name and parameter schema must be discovered from the deployed Space's `/gradio_api/info` endpoint. Do not hardcode guessed names.

## Notes

- GPU allocated only during inference (`@spaces.GPU`).
- Max input: 1024x1024.
- Max upload: 10 MB.
- Images are not stored after processing.
- Free ZeroGPU quota: 2 min/day unauthenticated, 5 min/day free account, 40 min/day PRO.

## License

Real-ESRGAN weights: BSD-3-Clause (Xintao Wang). Code: see NEON//SCALE project.