#!/bin/bash
set -e

ENV_NAME="bitvector-test"
PYTHON_VERSION="3.10"
MODEL_URL="https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth"
MODEL_DIR="app/weights"
MODEL_PATH="$MODEL_DIR/RealESRGAN_x4plus_anime_6B.pth"

echo "🚀 Setting up full Bit-to-Vector environment..."
echo "-----------------------------------------------"

# Detect OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
echo "🔍 Detected OS: $OS ($ARCH)"

# Ensure conda is installed
if ! command -v conda &> /dev/null; then
    echo "❌ Conda not found. Please install Miniconda or Anaconda first."
    exit 1
fi

# Create environment if it doesn’t exist
if conda env list | grep -q "^$ENV_NAME\s"; then
    echo "🔄 Environment '$ENV_NAME' already exists. Updating dependencies..."
else
    echo "📦 Creating new conda environment '$ENV_NAME'..."
    conda create -y -n $ENV_NAME python=$PYTHON_VERSION
fi

# Activate environment
eval "$(conda shell.bash hook)"
conda activate $ENV_NAME

echo "⚙️ Installing core dependencies..."
pip install --upgrade pip
pip install torch==1.13.1 torchvision==0.14.1 torchaudio==0.13.1 --extra-index-url https://download.pytorch.org/whl/cu117

# ✅ Mac-friendly pip packages (no OpenCV GUI)
# pip install basicsr==1.4.2 realesrgan opencv-python==4.8.1.78 numpy==1.26.4 scikit-image==0.25.2 scipy==1.15.3
pip install basicsr==1.4.2 realesrgan opencv-python-headless "numpy>=1.24,<1.27" scikit-image==0.21.0 "scipy>=1.10,<1.11"
# pip install fastapi==0.100.0 uvicorn==0.37.0 python-multipart==0.0.20 pydantic==1.10.13 loguru==0.7.3
pip install fastapi==0.100.0 "uvicorn>=0.30,<0.31" python-multipart==0.0.20 pydantic==1.10.13 loguru==0.7.3
pip install cairosvg cairocffi pillow tqdm

echo "✅ Python environment ready."

# --- Install VTracer ---
echo "🎨 Setting up VTracer..."
if ! command -v cargo &> /dev/null; then
    echo "📦 Installing Rust (Cargo)..."
    curl https://sh.rustup.rs -sSf | sh -s -- -y
    source "$HOME/.cargo/env"
fi

if ! command -v vtracer &> /dev/null; then
    echo "📦 Installing VTracer via Cargo..."
    cargo install vtracer
else
    echo "✅ VTracer already installed."
fi

# Add Cargo path for all OS types
echo "🔧 Ensuring Cargo path is added..."
if [[ "$OS" == "darwin" ]]; then
    SHELL_RC="$HOME/.zprofile"
elif [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_RC="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.profile"
fi

if ! grep -q 'cargo/bin' "$SHELL_RC"; then
    echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> "$SHELL_RC"
    echo "✅ Cargo path added to $SHELL_RC"
fi
source "$SHELL_RC"

# --- Model Download ---
echo "🧠 Checking ESRGAN model..."
mkdir -p "$MODEL_DIR"
if [ ! -f "$MODEL_PATH" ]; then
    echo "⬇️ Downloading ESRGAN model weights..."
    wget -q "$MODEL_URL" -P "$MODEL_DIR"
    echo "✅ Model downloaded: $MODEL_PATH"
else
    echo "✅ Model already exists."
fi

# --- Final Verification ---
echo "🧩 Verifying installation..."
python -c "import torch; print('Torch CUDA available:', torch.cuda.is_available())"
vtracer --version || echo "⚠️ VTracer not found in PATH (try restarting your terminal)."

echo "🎉 Setup complete!"
echo "-----------------------------------------------"
echo "👉 Activate environment: conda activate $ENV_NAME"
echo "👉 Run example: python app/features/conversion/vectorization.py --input app/samples/3.png"
echo "-----------------------------------------------"
