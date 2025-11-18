import argparse
import os
import cv2
import torch
from basicsr.archs.rrdbnet_arch import RRDBNet
from realesrgan import RealESRGANer


def main():
    parser = argparse.ArgumentParser(description="Real-ESRGAN Upscaling Script")
    parser.add_argument("--input", type=str, required=True, help="Path to input image")
    parser.add_argument("--model_path", type=str, required=True, help="Path to RealESRGAN model (.pth)")
    parser.add_argument("--output", type=str, default="output", help="Output directory")
    parser.add_argument("--scale", type=int, default=4, help="Upscale factor (default: 4)")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    # 🧠 Use GPU if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🧠 Using device: {device}")

    # 🏗️ Initialize model architecture (anime_6B variant)
    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64,
                    num_block=6, num_grow_ch=32, scale=args.scale)

    # ⚙️ Initialize RealESRGANer
    upsampler = RealESRGANer(
        scale=args.scale,
        model_path=args.model_path,
        model=model,
        tile=0,            # no tiling
        tile_pad=10,
        pre_pad=0,
        half=not device == "cpu",  # use half precision on GPU
        gpu_id=None if device == "cpu" else 0
    )

    # 🖼️ Read input image
    img = cv2.imread(args.input, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"❌ Failed to read image: {args.input}")
        return

    print("🚀 Upscaling image with Real-ESRGAN...")

    # 🔄 Perform upscaling
    try:
        output, _ = upsampler.enhance(img, outscale=args.scale)
    except RuntimeError as e:
        print("❌ Error during upscaling:", e)
        print("💡 Try using smaller --tile value to avoid CUDA OOM.")
        return

    # 💾 Save output
    filename = os.path.basename(args.input)
    name, ext = os.path.splitext(filename)
    out_path = os.path.join(args.output, f"{name}_upscaled{ext}")
    cv2.imwrite(out_path, output)

    print(f"✅ Upscaled image saved to: {out_path}")


if __name__ == "__main__":
    main()
    