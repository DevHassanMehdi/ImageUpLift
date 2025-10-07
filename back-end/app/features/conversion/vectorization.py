import argparse
import os
import cv2
import subprocess

from basicsr.archs.rrdbnet_arch import RRDBNet
from realesrgan import RealESRGANer


# -------------------------------
# IMAGE QUALITY CHECK
# -------------------------------
def is_low_quality(image, threshold=512):
    """Check if image dimensions are below threshold (default 512px)."""
    h, w = image.shape[:2]
    return (h < threshold) or (w < threshold)


# -------------------------------
# UPSCALE FUNCTION USING Real-ESRGAN
# -------------------------------
def upscale_with_esrgan(img, model_path, device="cuda", outscale=4):
    """Upscale using Real-ESRGAN RRDBNet model."""
    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64,
                    num_block=23, num_grow_ch=32, scale=outscale)

    upsampler = RealESRGANer(
        scale=outscale,
        model_path=model_path,
        model=model,
        tile=0,          # use >0 if GPU OOM
        tile_pad=10,
        pre_pad=0,
        half=True,       # fp16 for speed
        gpu_id=None if device == "cpu" else 0
    )

    output, _ = upsampler.enhance(img, outscale=outscale)
    return output


# -------------------------------
# MAIN PIPELINE
# -------------------------------
def main():
    parser = argparse.ArgumentParser(description="Bitmap → Vector conversion pipeline")

    # General
    parser.add_argument("--input", type=str, required=True, help="Path to input bitmap image")
    parser.add_argument("--upscaler", type=str, required=True, help="Path to ESRGAN model weights (.pth)")
    parser.add_argument("--output", type=str, required=True, help="Output path for vectorized image (SVG)")
    parser.add_argument("--device", type=str, default="cuda", choices=["cuda", "cpu"], help="Device for ESRGAN")

    # Vtracer options
    parser.add_argument("--vtracer_mode", type=str, default="spline", choices=["spline", "polygon"],
                        help="Vtracer mode (spline = smooth curves, polygon = sharp edges)")
    parser.add_argument("--vtracer_colors", type=int, default=8,
                        help="Number of colors in the vectorized output")
    parser.add_argument("--vtracer_filter_speckles", type=int, default=4,
                        help="Remove small speckles (default=4)")
    parser.add_argument("--vtracer_layering", type=str, default="true", choices=["true", "false"],
                        help="Enable hierarchical layering in output (default=true)")
    parser.add_argument("--vtracer_scale", type=float, default=1.0,
                        help="Scaling factor for output SVG")

    args = parser.parse_args()

    # Step 1: Load image
    img = cv2.imread(args.input, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"❌ Could not load input image: {args.input}")

    # Step 2: Check quality
    if is_low_quality(img):
        print("⚠️ Low quality detected. Upscaling with Real-ESRGAN...")
        img = upscale_with_esrgan(img, args.upscaler, device=args.device)
        temp_upscaled = "temp_upscaled.png"
        cv2.imwrite(temp_upscaled, img)
        input_for_vtracer = temp_upscaled
    else:
        print("✅ Image quality is good. Skipping upscaling.")
        input_for_vtracer = args.input

    # Step 3: Run vtracer CLI with parameters
    print("🎨 Converting to vector with vtracer...")

    vtracer_cmd = [
        "vtracer",
        "--input", input_for_vtracer,
        "--output", args.output,
        "--mode", args.vtracer_mode,
        "--color-count", str(args.vtracer_colors),
        "--filter-speckles", str(args.vtracer_filter_speckles),
        "--hierarchical", args.vtracer_layering,
        "--scale", str(args.vtracer_scale),
    ]

    subprocess.run(vtracer_cmd, check=True)

    print(f"✅ Conversion complete! SVG saved at {args.output}")


if __name__ == "__main__":
    main()


