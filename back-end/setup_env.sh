#!/bin/bash
set -euo pipefail

ENV_NAME="imageuplift"
PYTHON_VERSION="3.10"
MODEL_DIR="app/weights"
MODEL_A="$MODEL_DIR/RealESRGAN_x4plus_anime_6B.pth"
MODEL_B="$MODEL_DIR/RealESRGAN_x4plus.pth"

echo "=============================================="
echo "Bit-to-Vector Backend Environment Setup"
echo "=============================================="

# Detect OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
if grep -qi microsoft /proc/version 2>/dev/null; then
  OS="wsl"
fi
echo "Detected OS: $OS"

# Ensure conda
if ! command -v conda >/dev/null 2>&1; then
  echo "Conda not found. Please install Miniconda/Anaconda first."
  exit 1
fi

# Create env if needed
if conda env list | grep -q "^$ENV_NAME\s"; then
  echo "Environment '$ENV_NAME' exists. Using it..."
else
  echo "Creating conda environment '$ENV_NAME'..."
  conda create -y -n "$ENV_NAME" python="$PYTHON_VERSION"
fi

# Activate environment
eval "$(conda shell.bash hook)"
conda activate "$ENV_NAME"

# System deps
echo "Installing system dependencies (potrace + cairo libs)..."
if [[ "$OS" == "linux" || "$OS" == "wsl" ]]; then
  sudo apt-get update -y
  sudo apt-get install -y potrace libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev libtiff5-dev build-essential pkg-config wget curl
elif [[ "$OS" == "darwin" ]]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew not found. Install it from https://brew.sh/ first."
    exit 1
  fi
  brew install potrace cairo pango giflib libjpeg libtiff
else
  echo "Skipping system package install for OS=$OS (install potrace manually if missing)."
fi

# Python deps
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install torch==1.13.1 torchvision==0.14.1 torchaudio==0.13.1 --extra-index-url https://download.pytorch.org/whl/cu117

pip install basicsr==1.4.2 realesrgan opencv-python-headless "numpy>=1.24,<1.27" scikit-image==0.21.0 "scipy>=1.10,<1.11"
pip install fastapi==0.100.0 "uvicorn>=0.30,<0.31" python-multipart==0.0.20 pydantic==1.10.13 loguru==0.7.3
pip install cairosvg cairocffi pillow tqdm
pip install git+https://github.com/openai/CLIP.git

# Rust/Cargo + vtracer
echo "Setting up VTracer (Rust)..."
if ! command -v cargo >/dev/null 2>&1; then
  echo "Installing Rust (cargo)..."
  curl https://sh.rustup.rs -sSf | sh -s -- -y
  source "$HOME/.cargo/env"
fi

if ! command -v vtracer >/dev/null 2>&1; then
  echo "Installing vtracer via cargo..."
  cargo install vtracer
else
  echo "vtracer already installed."
fi

# Ensure cargo on PATH
if ! echo "$PATH" | grep -q "\.cargo/bin"; then
  if [[ -n "${BASH_SOURCE:-}" ]]; then
    shell_rc="$HOME/.bashrc"
  elif [[ "$SHELL" == *"zsh"* ]]; then
    shell_rc="$HOME/.zshrc"
  else
    shell_rc="$HOME/.profile"
  fi
  echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> "$shell_rc"
  export PATH="$HOME/.cargo/bin:$PATH"
fi

echo "Checking ESRGAN models..."
mkdir -p "$MODEL_DIR"
missing=0
for m in "$MODEL_A" "$MODEL_B"; do
  if [ ! -f "$m" ]; then
    echo "❌ Missing model: $m"
    missing=1
  else
    echo "✅ Found model: $m"
  fi
done
if [ $missing -eq 1 ]; then
  echo "❌ ESRGAN weights not found in repo. Place the required .pth files in $MODEL_DIR."
fi

echo "Verifying installation..."
python - <<EOF
import torch
print("Torch version:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())
EOF
vtracer --version || echo "vtracer not found in PATH (restart shell if needed)."

echo "=============================================="
echo "Setup complete."
echo "Activate env: conda activate $ENV_NAME"
echo "Run backend:  uvicorn app.main:app --reload --port 5001"
echo "=============================================="
