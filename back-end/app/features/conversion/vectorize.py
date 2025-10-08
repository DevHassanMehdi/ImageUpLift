import argparse
import os
import subprocess
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Bitmap to Vector converter using vtracer (v0.6.4 compatible)")
    parser.add_argument("--input", required=True, help="Path to input bitmap image")
    parser.add_argument("--mode", default="polygon", choices=["pixel", "polygon", "spline"], help="Vectorization mode")
    parser.add_argument("--color_precision", type=int, default=12, help="Number of significant bits for color precision")
    parser.add_argument("--filter_speckle", type=int, default=2, help="Filter out small speckles below this size (px)")
    parser.add_argument("--hierarchical", type=str, default="stacked", choices=["stacked", "cutout"], help="Hierarchical clustering mode")
    parser.add_argument("--preset", type=str, choices=["bw", "poster", "photo"], help="Optional preset configuration")

    args = parser.parse_args()

    # Paths
    input_path = Path(args.input)
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"{input_path.stem}.svg"

    print("🎨 Running vtracer...")

    # Build command
    cmd = [
        "vtracer",
        "--input", str(input_path),
        "--output", str(output_file),
        "--mode", args.mode,
        "--color_precision", str(args.color_precision),
        "--filter_speckle", str(args.filter_speckle),
        "--hierarchical", args.hierarchical
    ]

    if args.preset:
        cmd.extend(["--preset", args.preset])

    print(f"⚙️ Command: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True)
        print(f"✅ Vectorization complete! SVG saved at: {output_file}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running vtracer: {e}")

if __name__ == "__main__":
    main()
