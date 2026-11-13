"""NEON//SCALE cloud inference service (Hugging Face ZeroGPU + Gradio).

This Space runs Real-ESRGAN x4plus (RRDBNet, 23 blocks) for 4x super-resolution.
It is the cloud counterpart of the local NEON//SCALE engine.

GPU is allocated only during inference via the @spaces.GPU decorator.
"""

import os
import sys
import types
import tempfile
import uuid
from typing import Tuple

# Compatibility shim: newer torchvision removed functional_tensor module.
import torchvision.transforms.functional as _F
_fake_ft = types.ModuleType("torchvision.transforms.functional_tensor")
_fake_ft.rgb_to_grayscale = _F.rgb_to_grayscale
sys.modules["torchvision.transforms.functional_tensor"] = _fake_ft

import numpy as np
import spaces
import torch
from PIL import Image
from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet

import gradio as gr

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MODEL_NAME = "RealESRGAN_x4plus"
MODEL_URL = (
    "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/"
    "RealESRGAN_x4plus.pth"
)
SCALE = 4
MAX_INPUT_DIM = 1024  # reject very large inputs to protect ZeroGPU memory
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp"}

# ---------------------------------------------------------------------------
# Model (loaded once per worker)
# ---------------------------------------------------------------------------

_UPSAMPLER = None


def _build_model() -> RealESRGANer:
    model = RRDBNet(
        num_in_ch=3,
        num_out_ch=3,
        num_feat=64,
        num_block=23,
        num_grow_ch=32,
        scale=SCALE,
    )
    upsampler = RealESRGANer(
        scale=SCALE,
        model_path=MODEL_URL,
        model=model,
        tile=400,
        tile_pad=10,
        pre_pad=0,
        half=torch.cuda.is_available(),
    )
    return upsampler


def get_upsampler() -> RealESRGANer:
    global _UPSAMPLER
    if _UPSAMPLER is None:
        _UPSAMPLER = _build_model()
    return _UPSAMPLER


# ---------------------------------------------------------------------------
# Validation helpers (pure, testable)
# ---------------------------------------------------------------------------

def validate_image(img: Image.Image) -> None:
    if img is None:
        raise ValueError("No image provided.")
    w, h = img.size
    if w <= 0 or h <= 0:
        raise ValueError("Invalid image dimensions.")
    if w > MAX_INPUT_DIM or h > MAX_INPUT_DIM:
        raise ValueError(
            f"Image too large ({w}x{h}). Maximum supported input is "
            f"{MAX_INPUT_DIM}x{MAX_INPUT_DIM}."
        )


def prepare_input(img: Image.Image) -> np.ndarray:
    """Convert a PIL image to an RGB numpy array (alpha dropped, handled separately)."""
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    return np.array(img.convert("RGB"))


def has_alpha(img: Image.Image) -> bool:
    return img.mode == "RGBA" or (img.mode == "P" and "transparency" in img.info)


# ---------------------------------------------------------------------------
# Inference (GPU)
# ---------------------------------------------------------------------------

@spaces.GPU
def upscale(image: Image.Image) -> Image.Image:
    """Run Real-ESRGAN 4x inference. GPU allocated only for this call."""
    if image is None:
        raise gr.Error("No image provided.")

    validate_image(image)
    had_alpha = has_alpha(image)
    alpha = None
    if had_alpha:
        alpha = np.array(image.convert("RGBA"))[:, :, 3]

    rgb = prepare_input(image)
    upsampler = get_upsampler()
    try:
        output, _ = upsampler.enhance(rgb, outscale=SCALE)
    except Exception as exc:  # noqa: BLE001
        raise gr.Error(f"Inference failed: {exc}")

    out_img = Image.fromarray(output)

    # Bilinear upscale of alpha channel to match 4x output.
    if alpha is not None:
        a = Image.fromarray(alpha, mode="L")
        a_up = a.resize(out_img.size, Image.BILINEAR)
        out_img = out_img.convert("RGBA")
        out_img.putalpha(a_up)

    return out_img


# ---------------------------------------------------------------------------
# Gradio interface
# ---------------------------------------------------------------------------

DESCRIPTION = (
    "NEON//SCALE cloud upscaler — Real-ESRGAN x4plus (4x AI super-resolution). "
    "Images are processed on a ZeroGPU instance and are not stored after processing."
)

demo = gr.Interface(
    fn=upscale,
    inputs=gr.Image(type="pil", label="Input image"),
    outputs=gr.Image(type="pil", label="Upscaled (4x)"),
    title="NEON//SCALE — Cloud Upscaler",
    description=DESCRIPTION,
    allow_flagging="never",
)

if __name__ == "__main__":
    demo.launch()