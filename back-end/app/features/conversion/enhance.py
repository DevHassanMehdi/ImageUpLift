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
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🧠 Using device: {device}")

    # ✅ Use the RRDBNet architecture for photo-realistic enhancement
    model = RRDBNet(
        num_in_ch=3,
        num_out_ch=3,
        num_feat=64,
        num_block=23,   # larger model, more detail
        num_grow_ch=32,
        scale=args.scale
    )

    # ⚙️ Initialize RealESRGANer for photo enhancement
    upsampler = RealESRGANer(
        scale=args.scale,
        model_path=args.model_path,
        model=model,
        tile=0,
        tile_pad=10,
        pre_pad=0,
        half=not device == "cpu",
        gpu_id=None if device == "cpu" else 0
    )

    img = cv2.imread(args.input, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"❌ Failed to read image: {args.input}")
        return

    print("🚀 Upscaling image realistically with RealESRGAN_x4plus...")

    try:
        output, _ = upsampler.enhance(img, outscale=args.scale)
    except RuntimeError as e:
        print("❌ Error during upscaling:", e)
        print("💡 Try using smaller --tile value to avoid CUDA OOM.")
        return

    filename = os.path.basename(args.input)
    name, ext = os.path.splitext(filename)
    base = args.base_name or name
    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S-%f")
    out_path = os.path.join(args.output, f"{base}_real_upscaled_{ts}{ext}")
    cv2.imwrite(out_path, output)

    print(f"✅ Realistically upscaled image saved to: {out_path}")


if __name__ == "__main__":
    main()
    
