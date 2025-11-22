import argparse
import os
import cv2
import subprocess
import tempfile
import torch
from datetime import datetime
from shutil import which
from basicsr.archs.rrdbnet_arch import RRDBNet
from realesrgan import RealESRGANer

# ---------- helpers ----------
def ensure_vtracer():
    if which("vtracer") is None:
        raise RuntimeError("vtracer not found in PATH. Install it (e.g., `cargo install vtracer`).")

def measure_image_quality(image_path: str) -> float:
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Image not found: {image_path}")
    return cv2.Laplacian(img, cv2.CV_64F).var()

def safe_svg_path(output_dir: str, base_name: str) -> str:
    """Return a unique SVG path with timestamp to avoid collisions."""
    os.makedirs(output_dir, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S-%f")
    candidate = os.path.join(output_dir, f"{base_name}_vectorized_{ts}.svg")
    i = 1
    while os.path.exists(candidate):
        candidate = os.path.join(output_dir, f"{base_name}_vectorized_{ts}_{i}.svg")
        i += 1
    return candidate

# ---------- ESRGAN upscaling ----------
def upscale_image(input_path: str, model_path: str, scale: int, device: str, args):
    model = RRDBNet(
        num_in_ch=3, num_out_ch=3, num_feat=64,
        num_block=6, num_grow_ch=32, scale=scale
    )

    upsampler = RealESRGANer(
        scale=scale,
        model_path=model_path,
        model=model,
        tile=args.tile,         # <<< tiling enabled
        tile_pad=args.tile_pad, # <<< padding
        pre_pad=0,
        half=(device == "cuda"),
        gpu_id=None if device == "cpu" else 0
    )

    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Failed to read image: {input_path}")

    out, _ = upsampler.enhance(img, outscale=scale)
    return out

# ---------- VTracer wrapper ----------
def vectorize_to_svg(raster_path: str, svg_path: str, args):
    cmd = [
        "vtracer",
        "--input", raster_path,
        "--output", svg_path,
        "--mode", args.mode,
        "--color_precision", str(args.color_precision),
        "--filter_speckle", str(args.filter_speckle),
        "--hierarchical", args.hierarchical,
        "--corner_threshold", str(args.corner_threshold),
        "--gradient_step", str(args.gradient_step),
        "--segment_length", str(args.segment_length),
        "--splice_threshold", str(args.splice_threshold),
        "--path_precision", str(args.path_precision),
    ]
    subprocess.run(cmd, check=True)

# ---------- per-image pipeline ----------
def process_image(image_path: str, args, device: str):
    base = args.base_name or os.path.splitext(os.path.basename(image_path))[0]
    target_svg = safe_svg_path(args.output, base)

    score = measure_image_quality(image_path)
    print(f"• {os.path.basename(image_path)} | sharpness={score:.2f}", end=" ")

    if score < args.quality_threshold:
        print(f"→ upscale (thr {args.quality_threshold}) → vectorize")

        upscaled = upscale_image(image_path, args.model_path, args.scale, device, args)

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False, dir=args.output)
        tmp_path = tmp.name
        tmp.close()
        try:
            cv2.imwrite(tmp_path, upscaled)
            vectorize_to_svg(tmp_path, target_svg, args)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    else:
        print("→ vectorize (no upscale)")
        vectorize_to_svg(image_path, target_svg, args)

# ---------- main ----------
def main():
    parser = argparse.ArgumentParser(description="Bitmap → (optional ESRGAN) → VTracer (SVG)")

    parser.add_argument("--input", required=True, help="Image file or folder")
    parser.add_argument("--model_path", required=False,
                        default="app/weights/RealESRGAN_x4plus_anime_6B.pth",
                        help="Path to Real-ESRGAN .pth model")
    parser.add_argument("--output", default="output", help="Output directory for SVGs")
    parser.add_argument("--scale", type=int, default=4, help="Upscale factor (default: 4)")
    parser.add_argument("--quality_threshold", type=float, default=5500.0,
                        help="Laplacian variance threshold")
    parser.add_argument("--base_name", default=None, help="Base name for output (used by API)")

    # NEW: Tiling options
    parser.add_argument("--tile", type=int, default=1024,
                        help="Tile size for ESRGAN upscaling (default: 1024)")
    parser.add_argument("--tile_pad", type=int, default=10,
                        help="Tile padding for ESRGAN (default: 10)")

    # VTracer defaults
    parser.add_argument("--mode", default="spline", choices=["polygon", "spline", "pixel"])
    parser.add_argument("--color_precision", type=int, default=6)
    parser.add_argument("--filter_speckle", type=int, default=8)
    parser.add_argument("--hierarchical", default="stacked", choices=["stacked", "cutout"])
    parser.add_argument("--corner_threshold", type=int, default=40)
    parser.add_argument("--gradient_step", type=int, default=60)
    parser.add_argument("--segment_length", type=int, default=10)
    parser.add_argument("--splice_threshold", type=int, default=80)
    parser.add_argument("--path_precision", type=int, default=1)

    args = parser.parse_args()
    ensure_vtracer()

    if not os.path.isfile(args.model_path):
        raise FileNotFoundError(f"ESRGAN model not found: {args.model_path}")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🧠 Using device: {device}")
    os.makedirs(args.output, exist_ok=True)

    valid_exts = (".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif", ".tiff")

    if os.path.isdir(args.input):
        images = [os.path.join(args.input, f)
                  for f in os.listdir(args.input)
                  if f.lower().endswith(valid_exts)]

        if not images:
            print("No valid images found in folder.")
            return

        for img in sorted(images):
            process_image(img, args, device)
    else:
        if not args.input.lower().endswith(valid_exts):
            raise ValueError("Unsupported image format.")
        process_image(args.input, args, device)

    print("✅ All conversions complete.")

if __name__ == "__main__":
    main()
