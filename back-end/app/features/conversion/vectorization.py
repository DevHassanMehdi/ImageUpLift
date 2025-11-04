import argparse
import os
import cv2
import subprocess
import tempfile
import torch
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
    os.makedirs(output_dir, exist_ok=True)
    candidate = os.path.join(output_dir, f"{base_name}_vectorized.svg")
    if not os.path.exists(candidate):
        return candidate
    i = 1
    while True:
        candidate_i = os.path.join(output_dir, f"{base_name}_vectorized_{i}.svg")
        if not os.path.exists(candidate_i):
            return candidate_i
        i += 1


# ---------- ESRGAN upscaling ----------
def upscale_image(input_path: str, model_path: str, scale: int, device: str):
    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64,
                    num_block=6, num_grow_ch=32, scale=scale)
    upsampler = RealESRGANer(
        scale=scale,
        model_path=model_path,
        model=model,
        tile=0,
        tile_pad=10,
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
        "--hierarchical", args.hierarchical,
        "--filter_speckle", str(args.filter_speckle),
        "--color_precision", str(args.color_precision),
    ]

    # Optional preset
    if args.preset:
        cmd.extend(["--preset", args.preset])

    # Spline-only parameters
    if args.mode == "spline":
        cmd.extend([
            "--corner_threshold", str(args.corner_threshold),
            "--segment_length", str(args.segment_length),
            "--splice_threshold", str(args.splice_threshold),
        ])

    # Always include remaining optional params
    cmd.extend([
        "--gradient_step", str(args.gradient_step),
        "--path_precision", str(args.path_precision),
    ])

    print("🧩 Running VTracer:", " ".join(cmd))
    subprocess.run(cmd, check=True)


# ---------- per-image pipeline ----------
def process_image(image_path: str, args, device: str):
    base = os.path.splitext(os.path.basename(image_path))[0]
    target_svg = safe_svg_path(args.output, base)

    score = measure_image_quality(image_path)
    print(f"• {os.path.basename(image_path)} | sharpness={score:.2f}", end=" ")

    if score < args.quality_threshold:
        print(f"→ upscale (thr {args.quality_threshold}) → vectorize")
        upscaled = upscale_image(image_path, args.model_path, args.scale, device)
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

    # 🧠 VTracer parameters (updated)
    parser.add_argument("--mode", default="polygon", choices=["pixel", "polygon", "spline"],
                        help="Vectorization mode")
    parser.add_argument("--hierarchical", type=str, default="stacked",
                        choices=["stacked", "cutout"], help="Hierarchical clustering mode")
    parser.add_argument("--filter_speckle", type=int, default=2,
                        help="Filter out small speckles below this size (px)")
    parser.add_argument("--color_precision", type=int, default=12,
                        help="Number of significant bits for color precision")
    parser.add_argument("--gradient_step", type=int, default=16,
                        help="Gradient step size (frontend slider)")
    parser.add_argument("--preset", type=str, choices=["bw", "poster", "photo"],
                        help="Optional preset configuration")
    # Spline mode parameters
    parser.add_argument("--corner_threshold", type=int, default=60)
    parser.add_argument("--segment_length", type=int, default=4)
    parser.add_argument("--splice_threshold", type=int, default=45)
    parser.add_argument("--path_precision", type=int, default=1)

    args = parser.parse_args()
    ensure_vtracer()

    # Model check only if ESRGAN is used
    if args.model_path and not os.path.isfile(args.model_path):
        print(f"⚠️ Warning: ESRGAN model not found at {args.model_path}. Skipping upscale.")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🧠 Using device: {device}")
    os.makedirs(args.output, exist_ok=True)

    valid_exts = (".png", ".jpg", ".jpeg", ".bmp", ".webp", ".tif", ".tiff")
    if os.path.isdir(args.input):
        images = [os.path.join(args.input, f) for f in os.listdir(args.input)
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
