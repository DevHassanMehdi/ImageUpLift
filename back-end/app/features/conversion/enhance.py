import argparse
import os
import cv2
import torch
from datetime import datetime
from basicsr.archs.rrdbnet_arch import RRDBNet
from realesrgan import RealESRGANer


def main():
    parser = argparse.ArgumentParser(description="Realistic Photo Upscaler using Real-ESRGAN")
    parser.add_argument("--input", type=str, required=True, help="Path to input image")
    parser.add_argument("--output", type=str, default="output", help="Output directory")
    parser.add_argument("--scale", type=int, default=4, help="Upscale factor (default: 4)")
    parser.add_argument("--model_path", type=str, default="RealESRGAN_x4plus.pth",
                        help="Path to the RealESRGAN_x4plus model (.pth)")
    parser.add_argument("--base_name", type=str, default=None, help="Base name override for output file")

    # NEW: Tiling options
    parser.add_argument("--tile", type=int, default=1024,
                        help="Tile size for tiled upscaling (default: 1024). Set to 0 to disable.")
    parser.add_argument("--tile_pad", type=int, default=10,
                        help="Padding for each tile to avoid seams (default: 10).")

    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🧠 Using device: {device}")

    # RRDBNet architecture for Real-ESRGAN
    model = RRDBNet(
        num_in_ch=3,
        num_out_ch=3,
        num_feat=64,
        num_block=23,
        num_grow_ch=32,
        scale=args.scale
    )

    # Initialize RealESRGANer with tiling
    upsampler = RealESRGANer(
        scale=args.scale,
        model_path=args.model_path,
        model=model,
        tile=args.tile,          # <<< tiling enabled
        tile_pad=args.tile_pad,  # <<< tile padding
        pre_pad=0,
        half=not device == "cpu",
        gpu_id=None if device == "cpu" else 0
    )

    img = cv2.imread(args.input, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"❌ Failed to read image: {args.input}")
        return

    print(f"🚀 Upscaling using RealESRGAN (tile={args.tile}, pad={args.tile_pad})...")

    try:
        output, _ = upsampler.enhance(img, outscale=args.scale)
    except RuntimeError as e:
        print("❌ Error during upscaling:", e)
        print("💡 Try using a smaller --tile value to avoid CUDA OOM (e.g., 256 or 128).")
        return

    filename = os.path.basename(args.input)
    name, ext = os.path.splitext(filename)
    base = args.base_name or name
    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S-%f")
    out_path = os.path.join(args.output, f"{base}_real_upscaled_{ts}{ext}")
    cv2.imwrite(out_path, output)

    print(f"✅ Image successfully upscaled and saved to: {out_path}")


if __name__ == "__main__":
    main()
