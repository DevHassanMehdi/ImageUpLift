# ImageUpLift: Backend Overview

AI-powered image enhancement (Real-ESRGAN) and vectorization (VTracer/Potrace) served via FastAPI.

---

## What’s Inside (app/features)

### Conversion
- `router.py` — FastAPI routes:
  - `POST /conversion/recommend`: extract image metadata + recommend mode/settings.
  - `POST /conversion/convert`: run vectorize (VTracer), outline (Canny + Potrace), or enhance (Real-ESRGAN).
- `vectorization.py` — Pipeline: sharpness check → optional ESRGAN upscale → VTracer SVG. Unique timestamped filenames.
- `outline.py` — Canny + Potrace outline SVG with timestamped filenames.
- `enhance.py` — Real-ESRGAN photo upscaler; unique timestamped outputs.
- `vectorize.py` — Standalone VTracer wrapper (no upscale).
- `upscale.py` — Standalone ESRGAN upscaler.

### Helpers
- `recommend_settings.py` — Extracts metadata (OpenCV/PIL/CLIP) and recommends conversion mode + vectorize/outline settings.

---

## Setup

```bash
git clone https://github.com/DevHassanMehdi/ImageUpLift.git
cd ImageUpLift/back-end
chmod +x setup_env.sh
./setup_env.sh              # installs conda env, torch, realesrgan, vtracer, potrace
# GPU (Linux/WSL + NVIDIA): USE_CUDA=1 ./setup_env.sh
conda activate imageuplift
```

Ensure the weights exist:
- `app/weights/RealESRGAN_x4plus_anime_6B.pth`
- `app/weights/RealESRGAN_x4plus.pth`
The setup script will warn if missing.

Run API:
```bash
uvicorn app.main:app --reload --port 5001
```

---

## CLI Examples

- Vectorization (auto-upscale if low sharpness):
```bash
python app/features/conversion/vectorization.py --input app/samples/3.png --model_path app/weights/RealESRGAN_x4plus_anime_6B.pth
```

- Outline only:
```bash
python app/features/conversion/outline.py --input app/samples/3.png --low 80 --high 180
```

- Enhance only:
```bash
python app/features/conversion/enhance.py --input app/samples/3.png --scale 4
```

- Recommendation (metadata + suggested settings):
```bash
python app/features/helpers/recommend_settings.py --input app/samples/3.png
```

Key VTracer flags (vectorization.py):
- `--mode {spline|polygon|pixel}` (default spline)
- `--color_precision`, `--filter_speckle`, `--hierarchical {stacked|cutout}`
- `--corner_threshold`, `--gradient_step`, `--segment_length`, `--splice_threshold`, `--path_precision`
- `--quality_threshold` (Laplacian sharpness) to decide upscale

---

## Troubleshooting
- Missing potrace/vtracer: re-run `setup_env.sh` or install manually (apt/brew; cargo install vtracer).
- Missing ESRGAN weights: place required `.pth` files under `app/weights/`.
- NumPy/torch import issues: recreate env with `setup_env.sh` (pins torch 1.13.1 / torchvision 0.14.1 / numpy <2).

---

## License
---
