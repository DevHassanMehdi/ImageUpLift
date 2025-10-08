# 🖼️ Bit-to-Vector: AI-Powered Image Upscaler and Vectorizer

A hybrid image processing pipeline that automatically **enhances low-quality bitmap images** using **Real-ESRGAN** and converts them into **vector graphics (SVG)** using **VTracer** — all in one command.

---

## 🚀 Features

- ✅ Automatic **image quality detection** (sharpness-based)
- 🧠 Intelligent **ESRGAN upscaling** for low-quality images
- 🎨 Seamless **VTracer vectorization** to SVG
- ⚡ Batch processing for entire folders
- 💾 Clean file naming — e.g. `image_vectorized.svg`
- 🔧 CUDA GPU acceleration support
- 🧩 Fully configurable via command-line arguments

---

## 📁 Folder Structure

```
bit-to-vector/
├── back-end
│   ├── README.md
│   ├── app
│   │   ├── features
│   │   │   ├── conversion
│   │   │   │   ├── vectorization.py        # Main script (upscale + vectorize)
│   │   │   │   ├── upscale.py              # Standalone upscaler
│   │   │   │   └── vectorize.py            # Standalone vectorizer
│   │   ├── main.py
│   │   └── weights/                        # Pretrained ESRGAN weights
│   │       └── RealESRGAN_x4plus_anime_6B.pth
│   ├── env.yml                             # Conda environment file
│   ├── install_vtracer.sh                  # Auto-installer for VTracer
│   ├── output/                             # Generated SVG files
│   │   ├── 1_vectorized.svg
│   │   ├── 2_vectorized.svg
│   │   └── ...
│   └── samples/                            # Test input images
│       ├── 1.png
│       ├── 2.webp
│       ├── ...
└── front-end/
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/DevHassanMehdi/bit-to-vector.git
cd bit-to-vector/back-end
```

---

### 2️⃣ Create the Conda Environment

```bash
conda env create -f env.yml
conda activate bitvector
```

---

### 3️⃣ Install VTracer

```bash
chmod +x install_vtracer.sh
./install_vtracer.sh
```

Then add Cargo binaries to your path:

```bash
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify installation:

```bash
vtracer --version
```

---

### 4️⃣ Download ESRGAN Weights

Place your **ESRGAN model weights** inside:
```
back-end/app/weights/
```

Example:
```
RealESRGAN_x4plus_anime_6B.pth
```

---

## 🧠 Running the Script

### 🖼️ Single Image Conversion

```bash
python app/features/conversion/vectorization.py   --input app/samples/3.png   --model_path app/weights/RealESRGAN_x4plus_anime_6B.pth
```

---

### 📂 Batch Folder Conversion

```bash
python app/features/conversion/vectorization.py   --input app/samples/   --model_path app/weights/RealESRGAN_x4plus_anime_6B.pth
```

This automatically:
- Checks each image’s sharpness  
- Upscales only low-quality ones  
- Converts all to `*_vectorized.svg` in `/output/`

---

## ⚙️ Command-line Options

| Argument | Description | Default |
|-----------|--------------|----------|
| `--input` | Path to image file or folder | **Required** |
| `--model_path` | Path to ESRGAN `.pth` weights | **Required** |
| `--scale` | Upscale factor | `4` |
| `--quality_threshold` | Sharpness threshold | `5500` |
| `--mode` | VTracer curve fitting mode (`spline`, `polygon`, `pixel`) | `spline` |
| `--color_precision` | RGB precision bits | `6` |
| `--filter_speckle` | Minimum speckle size to filter | `16` |
| `--hierarchical` | Clustering type (`stacked` / `cutout`) | `stacked` |
| `--corner_threshold` | Corner detection angle | `40` |
| `--gradient_step` | Color gradient step | `60` |
| `--segment_length` | Maximum spline segment length | `10` |
| `--splice_threshold` | Spline splicing angle | `80` |
| `--path_precision` | Decimal precision in path | `1` |

---

## 🧪 Example Output

After running:
```
python app/features/conversion/vectorization.py --input app/samples/1.png
```

You’ll find:
```
back-end/output/1_vectorized.svg
```

---

## ⚡ Troubleshooting

| Issue | Fix |
|--------|-----|
| `vtracer: command not found` | Run `./install_vtracer.sh` then `source ~/.zshrc` |
| `invalid load key, '\xa0'` | Ensure you’re using a `.pth` file, not `.safetensors` |
| `libcudnn_cnn_infer.so.8` error | Reinstall CUDA toolkit or run on CPU (`--device cpu`) |
| Sharpness threshold too low | Increase `--quality_threshold` to ~6000 for cleaner SVGs |

---

## 🧑‍💻 Contributors

- **You (Lead Developer)** – AI & Image Processing  
- Collaborators – Follow setup above, then test `vectorization.py`

---

## 📜 License

MIT License © 2025  
Developed for AI-based image enhancement and vectorization research.

---

## 🧩 Acknowledgments

- [Real-ESRGAN (Xintao Wang et al.)](https://github.com/xinntao/Real-ESRGAN)
- [VTracer (VisionCortex)](https://github.com/visioncortex/vtracer)
