#!/bin/bash
set -e

ENV_NAME="imageuplift"
PYTHON_VERSION="3.10"

echo "=============================================="
echo " 🚀 ImageUpLift Environment Setup"
echo "=============================================="

# --------------------------------------------------------------------
# Detect OS Platform (Linux / macOS / WSL)
# --------------------------------------------------------------------
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"

if grep -qi microsoft /proc/version 2>/dev/null; then
    OS="wsl"
fi

echo "🔍 Detected Platform: $OS"


# --------------------------------------------------------------------
# Ensure conda exists
# --------------------------------------------------------------------
if ! command -v conda &> /dev/null; then
    echo "❌ Conda not found. Install Miniconda or Anaconda first."
    exit 1
fi

eval "$(conda shell.bash hook)"

# --------------------------------------------------------------------
# Create or Update Environment
# --------------------------------------------------------------------
if conda env list | grep -q "^$ENV_NAME\s"; then
    echo "🔄 Environment '$ENV_NAME' already exists. Updating packages..."
else
    echo "📦 Creating environment '$ENV_NAME'..."
    conda create -y -n $ENV_NAME python=$PYTHON_VERSION
fi

conda activate $ENV_NAME


# --------------------------------------------------------------------
# Install Python Dependencies
# --------------------------------------------------------------------
echo "📦 Installing Python dependencies..."
pip install --upgrade pip

if [[ "$OS" == "linux" ]]; then
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
else
    pip install torch torchvision torchaudio
fi

pip install \
    basicsr==1.4.2 \
    realesrgan \
    opencv-python-headless \
    "numpy>=1.24" \
    "scipy>=1.10" \
    "scikit-image>=0.21" \
    fastapi==0.100.0 \
    "uvicorn>=0.30,<0.31" \
    python-multipart \
    pydantic==1.10.13 \
    pillow \
    tqdm \
    cairosvg \
    cairocffi \
    loguru \
    git+https://github.com/openai/CLIP.git



# --------------------------------------------------------------------
# System Dependencies (potrace, cairo, build tools)
# --------------------------------------------------------------------
echo "🛠 Installing system dependencies..."

if [[ "$OS" == "linux" || "$OS" == "wsl" ]]; then
    sudo apt-get update -y
    sudo apt-get install -y \
        build-essential \
        pkg-config \
        potrace \
        libcairo2-dev \
        libpango1.0-dev \
        libjpeg-dev \
        libgif-dev \
        libtiff5-dev \
        wget curl
fi

if [[ "$OS" == "darwin" ]]; then
    if ! command -v brew &> /dev/null; then
        echo "🍺 Homebrew not found — installing..."
        NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi

    brew install potrace cairo pango giflib libjpeg libtiff
fi


# --------------------------------------------------------------------
# Install Rust + Cargo
# --------------------------------------------------------------------
if ! command -v cargo &> /dev/null; then
    echo "📦 Installing Rust (Cargo)..."
    curl https://sh.rustup.rs -sSf | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# Add cargo PATH permanently (bash only)
if ! grep -q 'cargo/bin' "$HOME/.bashrc" 2>/dev/null; then
    echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> "$HOME/.bashrc"
fi

source "$HOME/.bashrc"


# --------------------------------------------------------------------
# Install VTracer
# --------------------------------------------------------------------
echo "🎨 Installing VTracer..."
if ! command -v vtracer &>/dev/null; then
    cargo install vtracer
else
    echo "✔ VTracer already installed."
fi


# --------------------------------------------------------------------
# Final Verification
# --------------------------------------------------------------------
echo "🔍 Verifying installation..."
python - <<EOF
import torch
print("Torch version:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())
EOF

vtracer --version || echo "⚠️ VTracer not in PATH"


echo "=============================================="
echo "🎉 ImageUpLift Setup Complete!"
echo "👉 Activate env:  conda activate $ENV_NAME"
echo "👉 Start backend: uvicorn app.main:app --reload"
echo "=============================================="
