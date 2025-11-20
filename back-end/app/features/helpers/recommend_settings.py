import os
import argparse
import json
from collections import Counter

import cv2
import numpy as np
from PIL import Image

import torch
import clip  # local CLIP – requires: pip install git+https://github.com/openai/CLIP.git


# -----------------------
# Helpers
# -----------------------

def to_python_type(x):
    if isinstance(x, (np.integer, np.int32, np.int64)):
        return int(x)
    if isinstance(x, (np.floating, np.float32, np.float64)):
        return float(x)
    if isinstance(x, np.ndarray):
        return x.tolist()
    return x


def estimate_noise(img_cv):
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    noise = cv2.Laplacian(gray, cv2.CV_64F).var()
    return float(noise)


def get_color_count(pil_img):
    small = pil_img.resize((128, 128))
    colors = small.getcolors(128 * 128)
    return int(len(colors))


def get_dominant_colors(pil_img, top=5):
    small = pil_img.resize((64, 64))
    pixels = np.array(small).reshape(-1, 3)
    counts = Counter(map(tuple, pixels))
    return [list(map(int, c)) for c, _ in counts.most_common(top)]


def estimate_edge_complexity(img_cv):
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 80, 160)
    return int(np.count_nonzero(edges))


# -----------------------
# CLIP-based classification
# -----------------------

_CLIP_MODEL = None
_CLIP_PREPROCESS = None
_CLIP_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def load_clip_model():
    global _CLIP_MODEL, _CLIP_PREPROCESS
    if _CLIP_MODEL is None or _CLIP_PREPROCESS is None:
        _CLIP_MODEL, _CLIP_PREPROCESS = clip.load("ViT-B/32", device=_CLIP_DEVICE)
        _CLIP_MODEL.eval()
    return _CLIP_MODEL, _CLIP_PREPROCESS


def classify_with_clip(pil_img):
    model, preprocess = load_clip_model()

    text_prompts = [
        "a simple logo or icon on a plain background",
        "a flat vector illustration or graphic design",
        "a cartoon or character illustration",
        "a watercolor or stylized logo",
        "a realistic photograph of a person",
        "a realistic photograph of a landscape or scene"
    ]

    with torch.no_grad():
        image_input = preprocess(pil_img).unsqueeze(0).to(_CLIP_DEVICE)
        text_tokens = clip.tokenize(text_prompts).to(_CLIP_DEVICE)

        image_features = model.encode_image(image_input)
        text_features = model.encode_text(text_tokens)

        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)

        logits = (100.0 * image_features @ text_features.T).softmax(dim=-1)[0]
        probs = logits.cpu().numpy()

    graphic_indices = [0, 1, 2, 3]
    photo_indices = [4, 5]

    prob_graphic = float(sum(probs[i] for i in graphic_indices))
    prob_photo = float(sum(probs[i] for i in photo_indices))

    if prob_photo > prob_graphic:
        label = "photo"
        confidence = prob_photo
    else:
        label = "graphic"
        confidence = prob_graphic

    raw = {text_prompts[i]: float(probs[i]) for i in range(len(text_prompts))}
    return label, confidence, raw


# -----------------------
# Metadata extraction
# -----------------------

def extract_image_metadata(image_path):
    img_cv = cv2.imread(image_path)
    if img_cv is None:
        raise ValueError(f"Could not read image: {image_path}")

    pil_img = Image.open(image_path).convert("RGB")

    h, w, _ = img_cv.shape
    resolution = f"{w}x{h}"
    aspect_ratio = round(w / h, 2)
    file_size = os.path.getsize(image_path)

    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    color_count = get_color_count(pil_img)
    dominant_colors = get_dominant_colors(pil_img)
    noise_level = estimate_noise(img_cv)
    edge_complexity = estimate_edge_complexity(img_cv)

    clip_label, clip_conf, clip_raw = classify_with_clip(pil_img)

    metadata = {
        "file_name": os.path.basename(image_path),
        "resolution": resolution,
        "width": int(w),
        "height": int(h),
        "aspect_ratio": float(aspect_ratio),
        "file_size_bytes": int(file_size),
        "sharpness": round(sharpness, 2),
        "color_count": int(color_count),
        "dominant_colors": dominant_colors,
        "noise_level": round(noise_level, 2),
        "edge_complexity": int(edge_complexity),
        "ai_image_type": clip_label,
        "ai_confidence": round(clip_conf, 4),
        "ai_raw_probs": clip_raw
    }

    return {k: to_python_type(v) for k, v in metadata.items()}


# -----------------------
# Default settings
# -----------------------

DEFAULT_VECTOR_SETTINGS = {
    "mode": "spline",
    "color_precision": 6,
    "filter_speckle": 16,
    "hierarchical": "stacked",
    "corner_threshold": 40,
    "gradient_step": 60,
    "segment_length": 10,
    "splice_threshold": 80,
    "path_precision": 1,
    "scale": 4,
    "quality_threshold": 5500,
}

DEFAULT_OUTLINE_SETTINGS = {
    "low": 100,
    "high": 200
}


# -----------------------
# Vector recommendation
# -----------------------

def recommend_vector_settings(metadata):
    settings = DEFAULT_VECTOR_SETTINGS.copy()

    color_count = metadata["color_count"]
    edge_complexity = metadata["edge_complexity"]

    w, h = metadata["width"], metadata["height"]
    edge_density = edge_complexity / max((w * h), 1)

    # Small color palette → adjust slightly
    if color_count < 64:
        settings["color_precision"] = max(3, settings["color_precision"] - 2)
    elif color_count > 4000:
        settings["color_precision"] = min(8, settings["color_precision"] + 1)

    # High edges → boost fidelity
    if edge_density > 0.03:
        settings["path_precision"] = min(5, settings["path_precision"] + 2)
        settings["corner_threshold"] = min(80, settings["corner_threshold"] + 10)

    # Simple logos → reduce speckle filter
    if color_count < 64 and edge_density < 0.02:
        settings["filter_speckle"] = max(0, settings["filter_speckle"] - 8)

    return settings


# -----------------------
# Outline Recommendation
# -----------------------

def recommend_outline_settings(metadata):
    edge_complexity = metadata["edge_complexity"]
    w, h = metadata["width"], metadata["height"]
    edge_density = edge_complexity / max(w * h, 1)

    # Default
    low, high = 100, 200

    # Only adjust if NOT a photo
    if metadata["ai_image_type"] != "photo":
        if edge_density < 0.01:
            low, high = 10, 40
        elif edge_density < 0.03:
            low, high = 80, 180
        else:
            low, high = 120, 240

    return {"low": int(low), "high": int(high)}


# -----------------------
# Final recommendation logic
# -----------------------

def recommend_conversion(metadata):
    ai_type = metadata["ai_image_type"]

    # Mode decision
    if ai_type == "photo":
        conversion_mode = "enhance"
        vector_settings = DEFAULT_VECTOR_SETTINGS.copy()
        outline_settings = DEFAULT_OUTLINE_SETTINGS.copy()
    else:
        conversion_mode = "vector"
        vector_settings = recommend_vector_settings(metadata)
        outline_settings = recommend_outline_settings(metadata)

    return {
        "conversion_mode": conversion_mode,
        "vector_settings": vector_settings,
        "outline_settings": outline_settings
    }


# -----------------------
# Main
# -----------------------

def main():
    parser = argparse.ArgumentParser(description="Image metadata + recommendation")
    parser.add_argument("--input", required=True, help="Path to input image")
    args = parser.parse_args()

    metadata = extract_image_metadata(args.input)
    recommendation = recommend_conversion(metadata)

    result = {
        "metadata": metadata,
        "recommendation": recommendation
    }

    print(json.dumps(result, indent=4))


if __name__ == "__main__":
    main()
