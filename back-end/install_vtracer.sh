#!/usr/bin/env bash
set -e

echo "🎨 Setting up vtracer via Cargo..."

# --- Detect OS ---
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
IS_WSL=false
if grep -qi microsoft /proc/version 2>/dev/null; then IS_WSL=true; fi

echo "🔍 Detected OS: $OS"
if [ "$IS_WSL" = true ]; then
    echo "💡 Running inside WSL (Windows Subsystem for Linux)."
fi

# --- Step 1: Check if vtracer is already installed ---
if command -v vtracer &>/dev/null; then
    echo "✅ vtracer already installed: $(vtracer --version)"
    exit 0
fi

# --- Step 2: Check for Cargo (Rust package manager) ---
if ! command -v cargo &>/dev/null; then
    echo "🦀 Cargo not found. Installing Rust toolchain..."
    # macOS / Linux / WSL all support this installer
    curl https://sh.rustup.rs -sSf | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "✅ Cargo already installed: $(cargo --version)"
fi

# --- Step 3: Ensure Cargo binary path is in PATH ---
if [[ ":$PATH:" != *":$HOME/.cargo/bin:"* ]]; then
    echo "🧩 Adding Cargo bin directory to PATH..."
    SHELL_NAME=$(basename "$SHELL")
    if [ "$SHELL_NAME" = "zsh" ]; then
        PROFILE_FILE="$HOME/.zshrc"
    else
        PROFILE_FILE="$HOME/.bashrc"
    fi
    echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> "$PROFILE_FILE"
    source "$PROFILE_FILE"
fi

# --- Step 4: Install vtracer ---
echo "⬇️ Installing vtracer from crates.io..."
cargo install vtracer

# --- Step 5: Verify installation ---
if command -v vtracer &>/dev/null; then
    echo "✅ vtracer installed successfully!"
    vtracer --version
else
    echo "❌ vtracer installation failed. Please check your Rust setup."
    exit 1
fi
