"""CPU-side tests for cloud-space helper functions (no GPU/torch required)."""

import sys
import os
import types

# Stub heavy modules before importing app.
for name in ["spaces", "torch", "gradio", "realesrgan", "basicsr", "cv2"]:
    sys.modules[name] = types.ModuleType(name)
sys.modules["spaces"].GPU = lambda f: f
sys.modules["gradio"].Error = Exception
sys.modules["gradio"].Interface = lambda *a, **k: None
sys.modules["gradio"].Image = lambda *a, **k: None
sys.modules["realesrgan"].RealESRGANer = object
basicsr_archs = types.ModuleType("basicsr.archs.rrdbnet_arch")
basicsr_archs.RRDBNet = object
sys.modules["basicsr.archs.rrdbnet_arch"] = basicsr_archs
sys.modules["basicsr.archs"] = types.ModuleType("archs")
sys.modules["basicsr"] = types.ModuleType("basicsr")
sys.modules["cv2"] = types.ModuleType("cv2")

src_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app.py")
src = open(src_path).read()
ns = {}
exec(compile(src, "app.py", "exec"), ns)

validate_image = ns["validate_image"]
prepare_input = ns["prepare_input"]
has_alpha = ns["has_alpha"]
MAX_INPUT_DIM = ns["MAX_INPUT_DIM"]
SCALE = ns["SCALE"]

from PIL import Image
import numpy as np


def test_validate_valid():
    validate_image(Image.new("RGB", (64, 64)))


def test_validate_too_large():
    try:
        validate_image(Image.new("RGB", (MAX_INPUT_DIM + 1, 64)))
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_validate_none():
    try:
        validate_image(None)
        assert False
    except ValueError:
        pass


def test_prepare_input_rgb():
    img = Image.new("RGB", (4, 4), color=(10, 20, 30))
    arr = prepare_input(img)
    assert arr.shape == (4, 4, 3)
    assert arr.dtype == np.uint8


def test_prepare_input_rgba_drops_alpha():
    img = Image.new("RGBA", (4, 4), color=(10, 20, 30, 128))
    arr = prepare_input(img)
    assert arr.shape == (4, 4, 3)


def test_has_alpha():
    assert has_alpha(Image.new("RGBA", (4, 4))) is True
    assert has_alpha(Image.new("RGB", (4, 4))) is False


def test_scale_constant():
    assert SCALE == 4


def test_output_dimension_math():
    assert 32 * SCALE == 128
    assert 24 * SCALE == 96


if __name__ == "__main__":
    tests = [v for k, v in globals().items() if k.startswith("test_")]
    for t in tests:
        t()
        print("PASS", t.__name__)
    print(f"All {len(tests)} tests passed.")