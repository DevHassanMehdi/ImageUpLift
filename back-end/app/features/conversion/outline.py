import argparse
import os
import subprocess
import cv2
import numpy as np
from datetime import datetime

def detect_edges(image_path, low_threshold=100, high_threshold=200):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise FileNotFoundError(f"Failed to read image: {image_path}")

    # Use Gaussian blur before Canny to reduce noise
    blurred = cv2.GaussianBlur(img, (5, 5), 0)

    # Apply Canny edge detection
    edges = cv2.Canny(blurred, low_threshold, high_threshold)

    # Invert edges (Potrace expects black as foreground)
    edges_inverted = cv2.bitwise_not(edges)

    return edges_inverted


def save_as_pbm(edge_img, temp_path):
    # Ensure strictly 1-bit image (0 or 255 values)
    edge_img = np.where(edge_img > 128, 255, 0).astype(np.uint8)

    # Create PBM (Portable Bitmap) file
    height, width = edge_img.shape
    with open(temp_path, 'wb') as f:
        f.write(f"P4\n{width} {height}\n".encode())
        for y in range(height):
            row = edge_img[y]
            byte = 0
            bits_count = 0
            for pixel in row:
                bit = 0 if pixel == 255 else 1  # PBM: 1 = black, 0 = white
                byte = (byte << 1) | bit
                bits_count += 1
                if bits_count == 8:
                    f.write(bytes([byte]))
                    byte = 0
                    bits_count = 0
            if bits_count > 0:
                byte <<= (8 - bits_count)
                f.write(bytes([byte]))


def potrace_to_svg(pbm_path, svg_path):
    cmd = [
        "potrace",
        pbm_path,
        "--svg",
        "--flat",
        "--longcoding",
        "--opttolerance", "0.2",
        "-o", svg_path
    ]
    subprocess.run(cmd, check=True)

def safe_svg_path(output_dir, base_name):
    os.makedirs(output_dir, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d-%H%M%S-%f")
    path = os.path.join(output_dir, f"{base_name}_outline_{ts}.svg")
    i = 1
    while os.path.exists(path):
        path = os.path.join(output_dir, f"{base_name}_outline_{ts}_{i}.svg")
        i += 1
    return path


def process_image(image_path, output_dir, low, high, preview=False, base_name_override=None):
    base_name = base_name_override or os.path.splitext(os.path.basename(image_path))[0]
    temp_pbm = os.path.join(output_dir, f"{base_name}_temp_edges.pbm")
    final_svg = safe_svg_path(output_dir, base_name)

    print(f"🔍 Processing: {image_path}")
    print(f"✨ Detecting edges using Canny({low}, {high})...")

    edges = detect_edges(image_path, low, high)
    save_as_pbm(edges, temp_pbm)

    if preview:
        cv2.imwrite(os.path.join(output_dir, f"{base_name}_edge_preview.png"), edges)
        print(f"👀 Preview saved: {base_name}_edge_preview.png")

    print("✏️ Vectorizing with Potrace (outline mode)...")
    potrace_to_svg(temp_pbm, final_svg)

    if not preview:
        os.remove(temp_pbm)

    print(f"✅ Done! SVG created: {final_svg}")


def main():
    parser = argparse.ArgumentParser(description="Convert image to clean outline-only SVG using Canny + Potrace.")
    parser.add_argument("--input", required=True, help="Input image or folder")
    parser.add_argument("--output", default="outline_svg", help="Directory to save SVGs")
    parser.add_argument("--low", type=int, default=100, help="Canny low threshold")
    parser.add_argument("--high", type=int, default=200, help="Canny high threshold")
    parser.add_argument("--preview", action="store_true", help="Keep PBM & save PNG edge preview")
    parser.add_argument("--base_name", default=None, help="Base name override for outputs")
    args = parser.parse_args()

    valid_exts = (".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp")

    if os.path.isdir(args.input):
        for file in sorted(os.listdir(args.input)):
            full_path = os.path.join(args.input, file)
            if file.lower().endswith(valid_exts):
                process_image(full_path, args.output, args.low, args.high, args.preview, args.base_name)
    else:
        if not args.input.lower().endswith(valid_exts):
            raise ValueError("Unsupported image format")
        process_image(args.input, args.output, args.low, args.high, args.preview, args.base_name)


if __name__ == "__main__":
    main()
    
