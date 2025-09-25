#!/bin/bash

ENV_NAME="bitvector"
PYTHON_VERSION="3.11"
REQ_FILE="requirements.txt"

# Ensure we're in the backend directory
cd "$(dirname "$0")"

# Check if conda is installed
if ! command -v conda &> /dev/null
then
    echo "❌ Conda not found. Please install Miniconda/Anaconda first."
    exit 1
fi

# Check if the environment already exists
if conda env list | grep -q "^$ENV_NAME\s"; then
    echo "🔄 Environment '$ENV_NAME' already exists. Reinstalling dependencies..."
    conda activate $ENV_NAME || source activate $ENV_NAME
    pip install --no-cache-dir -r $REQ_FILE
else
    echo "🚀 Creating new conda environment '$ENV_NAME' with Python $PYTHON_VERSION..."
    conda create -y -n $ENV_NAME python=$PYTHON_VERSION
    conda activate $ENV_NAME || source activate $ENV_NAME
    echo "📦 Installing dependencies from $REQ_FILE..."
    pip install --no-cache-dir -r $REQ_FILE
fi

echo "✅ Environment setup complete! Use 'conda activate $ENV_NAME' to start working."
