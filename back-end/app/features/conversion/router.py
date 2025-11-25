from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
import tempfile, os, torch, subprocess
from app.features.conversion.vectorization import process_image
from app.features.conversion.outline import process_image as outline_process
from app.features.conversion.enhance import main as enhance_main  # 👈 import your enhance script
from app.features.helpers.recommend_settings import extract_image_metadata, recommend_conversion

from sqlalchemy.orm import Session
from app.db import get_db
from app import models


router = APIRouter(prefix="/conversion", tags=["Conversion"])

# Optional simple info endpoint
@router.get("/")
def get_conversion_info():
    return {"message": "This is the conversion feature endpoint."}

# ✅ Optional: explicitly allow OPTIONS for browsers that need it
@router.options("/convert")
async def options_convert():
    return JSONResponse({"message": "CORS preflight OK"}, status_code=200)

@router.post("/recommend")
async def recommend_settings(file: UploadFile = File(...)):
    """
    Accepts an image file, extracts metadata, and returns
    recommended conversion settings (vectorize, outline, and mode).
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # 1. Extract metadata
        metadata = extract_image_metadata(tmp_path)

        # 2. Get recommendation (vectorize + outline + mode)
        recommendation = recommend_conversion(metadata)

        # 3. Build response
        result = {
            "metadata": metadata,
            "recommendation": recommendation
        }

        return JSONResponse(result)

    except Exception as e:
        print("❌ Recommendation failed:", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to compute recommendation", "details": str(e)}
        )

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/convert")
async def convert_image(
    file: UploadFile = File(...),
    outputType: str = Form("vectorize"),  # 'vectorize', 'outline', 'enhance'
    # legacy fields (ignored for vectorize now)
    quality: str = Form("balanced"),
    detail: int = Form(75),
    colorReduction: str = Form("auto"),
    # outline fields
    low: int = Form(100),
    high: int = Form(200),
    # new vectorize fields
    hierarchical: str = Form("stacked"),
    filter_speckle: int = Form(8),
    color_precision: int = Form(6),
    gradient_step: int = Form(60),
    preset: str = Form(None),
    mode: str = Form("spline"),
    corner_threshold: int = Form(40),
    segment_length: int = Form(10),
    splice_threshold: int = Form(80)
):
    """
    Receives image + conversion settings and runs the correct pipeline.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        output_dir = "app/output"
        os.makedirs(output_dir, exist_ok=True)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        original_name = os.path.splitext(file.filename)[0] if file.filename else "upload"

        # ✅ vectorize mode
        if outputType.lower() == "vectorize":
            print("🟦 Starting vectorization with new parameters...")

            # Build command for subprocess call to vectorization.py
            cmd = [
                "python",
                "app/features/conversion/vectorization.py",
                "--input", tmp_path,
                "--output", output_dir,
                "--base_name", original_name,
                "--hierarchical", hierarchical,
                "--filter_speckle", str(filter_speckle),
                "--color_precision", str(color_precision),
                "--gradient_step", str(gradient_step),
                "--mode", mode,
            ]

            if preset:
                cmd.extend(["--preset", preset])

            if mode == "spline":
                cmd.extend([
                    "--corner_threshold", str(corner_threshold),
                    "--segment_length", str(segment_length),
                    "--splice_threshold", str(splice_threshold),
                ])

            print("📦 Running vectorization command:", " ".join(cmd))

            try:
                subprocess.run(cmd, check=True)
            except subprocess.CalledProcessError as e:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Vectorization process failed", "details": str(e)},
                )

            # Retrieve the latest .svg file
            svg_files = sorted(
                [f for f in os.listdir(output_dir) if f.endswith(".svg")],
                key=lambda f: os.path.getmtime(os.path.join(output_dir, f)),
                reverse=True,
            )
            if not svg_files:
                raise RuntimeError("No SVG output generated.")
            latest_svg = os.path.join(output_dir, svg_files[0])
            print(f"✅ Vectorization completed: {latest_svg}")
            return FileResponse(latest_svg, media_type="image/svg+xml")

        # ✅ OUTLINE mode
        elif outputType.lower() == "outline":
            print("🟨 Starting outline vectorization...")
            try:
                outline_process(tmp_path, output_dir, low, high, base_name_override=original_name)
            except FileNotFoundError:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Potrace not found. Please install it via 'brew install potrace'."},
                )
            except subprocess.CalledProcessError as e:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Potrace failed during outline vectorization.", "details": str(e)},
                )

            svg_files = sorted(
                [
                    f
                    for f in os.listdir(output_dir)
                    if f.endswith(".svg")
                    and ("_outline_" in f or f.endswith("_outline.svg"))
                    and (f.startswith(original_name) or original_name in f)
                ],
                key=lambda f: os.path.getmtime(os.path.join(output_dir, f)),
                reverse=True,
            )
            if not svg_files:
                raise RuntimeError("No outline SVG output generated.")
            latest_svg = os.path.join(output_dir, svg_files[0])
            print(f"✅ Outline conversion completed: {latest_svg}")
            return FileResponse(latest_svg, media_type="image/svg+xml")

        # ✅ ENHANCE mode
        elif outputType.lower() == "enhance":
            print("🟢 Starting image enhancement...")
            args = [
                "python",
                "app/features/conversion/enhance.py",
                "--input", tmp_path,
                "--output", output_dir,
                "--model_path", "app/weights/RealESRGAN_x4plus.pth",
                "--base_name", original_name,
            ]

            try:
                subprocess.run(args, check=True)
            except subprocess.CalledProcessError as e:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Enhance process failed", "details": str(e)},
                )

            upscaled_files = sorted(
                [
                    f
                    for f in os.listdir(output_dir)
                    if (f.endswith(".png") or f.endswith(".webp"))
                    and "_real_upscaled" in f
                    and (f.startswith(original_name) or original_name in f)
                ],
                key=lambda f: os.path.getmtime(os.path.join(output_dir, f)),
                reverse=True,
            )
            if not upscaled_files:
                raise RuntimeError("No upscaled image found.")
            latest = os.path.join(output_dir, upscaled_files[0])
            media_type = "image/webp" if latest.endswith(".webp") else "image/png"
            print(f"✅ Enhancement completed: {latest}")
            return FileResponse(latest, media_type=media_type)

        else:
            return JSONResponse(status_code=400, content={"error": f"Unsupported outputType: {outputType}"})

    except Exception as e:
        print("❌ Conversion failed:", e)
        return JSONResponse(status_code=500, content={"error": str(e)})

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse, JSONResponse
import tempfile, os, torch, subprocess, time
from app.features.conversion.vectorization import process_image
from app.features.conversion.outline import process_image as outline_process
from app.features.conversion.enhance import main as enhance_main  # 👈 import your enhance script
from app.features.helpers.recommend_settings import extract_image_metadata, recommend_conversion

from sqlalchemy.orm import Session
from app.db import get_db
from app import models


router = APIRouter(prefix="/conversion", tags=["Conversion"])

# Optional simple info endpoint
@router.get("/")
def get_conversion_info():
    return {"message": "This is the conversion feature endpoint."}

# ✅ Optional: explicitly allow OPTIONS for browsers that need it
@router.options("/convert")
async def options_convert():
    return JSONResponse({"message": "CORS preflight OK"}, status_code=200)

@router.post("/recommend")
async def recommend_settings(file: UploadFile = File(...)):
    """
    Accepts an image file, extracts metadata, and returns
    recommended conversion settings (vectorize, outline, and mode).
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # 1. Extract metadata
        metadata = extract_image_metadata(tmp_path)

        # 2. Get recommendation (vectorize + outline + mode)
        recommendation = recommend_conversion(metadata)

        # 3. Build response
        result = {
            "metadata": metadata,
            "recommendation": recommendation
        }

        return JSONResponse(result)

    except Exception as e:
        print("❌ Recommendation failed:", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to compute recommendation", "details": str(e)}
        )

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/convert")
async def convert_image(
    file: UploadFile = File(...),
    outputType: str = Form("vectorize"),  # 'vectorize', 'outline', 'enhance'
    # legacy fields (ignored for vectorize now)
    quality: str = Form("balanced"),
    detail: int = Form(75),
    colorReduction: str = Form("auto"),
    # outline fields
    low: int = Form(100),
    high: int = Form(200),
    # new vectorize fields
    hierarchical: str = Form("stacked"),
    filter_speckle: int = Form(8),
    color_precision: int = Form(6),
    gradient_step: int = Form(60),
    preset: str = Form(None),
    mode: str = Form("spline"),
    corner_threshold: int = Form(40),
    segment_length: int = Form(10),
    splice_threshold: int = Form(80),
    db: Session = Depends(get_db),
):
    """
    Receives image + conversion settings and runs the correct pipeline.
    """
    start_time = time.perf_counter()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        output_dir = "app/output"
        os.makedirs(output_dir, exist_ok=True)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        original_name = os.path.splitext(file.filename)[0] if file.filename else "upload"

        # ✅ vectorize mode
        if outputType.lower() == "vectorize":
            print("🟦 Starting vectorization with new parameters...")

            # Build command for subprocess call to vectorization.py
            cmd = [
                "python",
                "app/features/conversion/vectorization.py",
                "--input", tmp_path,
                "--output", output_dir,
                "--base_name", original_name,
                "--hierarchical", hierarchical,
                "--filter_speckle", str(filter_speckle),
                "--color_precision", str(color_precision),
                "--gradient_step", str(gradient_step),
                "--mode", mode,
            ]

            if preset:
                cmd.extend(["--preset", preset])

            if mode == "spline":
                cmd.extend([
                    "--corner_threshold", str(corner_threshold),
                    "--segment_length", str(segment_length),
                    "--splice_threshold", str(splice_threshold),
                ])

            print("📦 Running vectorization command:", " ".join(cmd))

            try:
                subprocess.run(cmd, check=True)
            except subprocess.CalledProcessError as e:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Vectorization process failed", "details": str(e)},
                )

            # Retrieve the latest .svg file
            svg_files = sorted(
                [f for f in os.listdir(output_dir) if f.endswith(".svg")],
                key=lambda f: os.path.getmtime(os.path.join(output_dir, f)),
                reverse=True,
            )
            if not svg_files:
                raise RuntimeError("No SVG output generated.")
            latest_svg = os.path.join(output_dir, svg_files[0])
            print(f"✅ Vectorization completed: {latest_svg}")

            # 💾 Log to database
            elapsed = time.perf_counter() - start_time
            db_entry = models.Conversion(
                image_name=file.filename or original_name,
                image_type=file.content_type,
                mode="vectorize",
                time_taken=elapsed,
            )
            db.add(db_entry)
            db.commit()

            return FileResponse(latest_svg, media_type="image/svg+xml")

        # ✅ OUTLINE mode
        elif outputType.lower() == "outline":
            print("🟨 Starting outline vectorization...")
            try:
                outline_process(tmp_path, output_dir, low, high, base_name_override=original_name)
            except FileNotFoundError:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Potrace not found. Please install it via 'brew install potrace'."},
                )
            except subprocess.CalledProcessError as e:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Potrace failed during outline vectorization.", "details": str(e)},
                )

            svg_files = sorted(
                [
                    f
                    for f in os.listdir(output_dir)
                    if f.endswith(".svg")
                    and ("_outline_" in f or f.endswith("_outline.svg"))
                    and (f.startswith(original_name) or original_name in f)
                ],
                key=lambda f: os.path.getmtime(os.path.join(output_dir, f)),
                reverse=True,
            )
            if not svg_files:
                raise RuntimeError("No outline SVG output generated.")
            latest_svg = os.path.join(output_dir, svg_files[0])
            print(f"✅ Outline conversion completed: {latest_svg}")

            # 💾 Log to database
            elapsed = time.perf_counter() - start_time
            db_entry = models.Conversion(
                image_name=file.filename or original_name,
                image_type=file.content_type,
                mode="outline",
                time_taken=elapsed,
            )
            db.add(db_entry)
            db.commit()

            return FileResponse(latest_svg, media_type="image/svg+xml")

        # ✅ ENHANCE mode
        elif outputType.lower() == "enhance":
            print("🟢 Starting image enhancement...")
            args = [
                "python",
                "app/features/conversion/enhance.py",
                "--input", tmp_path,
                "--output", output_dir,
                "--model_path", "app/weights/RealESRGAN_x4plus.pth",
                "--base_name", original_name,
            ]

            try:
                subprocess.run(args, check=True)
            except subprocess.CalledProcessError as e:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Enhance process failed", "details": str(e)},
                )

            upscaled_files = sorted(
                [
                    f
                    for f in os.listdir(output_dir)
                    if (f.endswith(".png") or f.endswith(".webp"))
                    and "_real_upscaled" in f
                    and (f.startswith(original_name) or original_name in f)
                ],
                key=lambda f: os.path.getmtime(os.path.join(output_dir, f)),
                reverse=True,
            )
            if not upscaled_files:
                raise RuntimeError("No upscaled image found.")
            latest = os.path.join(output_dir, upscaled_files[0])
            media_type = "image/webp" if latest.endswith(".webp") else "image/png"
            print(f"✅ Enhancement completed: {latest}")

            # 💾 Log to database
            elapsed = time.perf_counter() - start_time
            db_entry = models.Conversion(
                image_name=file.filename or original_name,
                image_type=file.content_type,
                mode="enhance",
                time_taken=elapsed,
            )
            db.add(db_entry)
            db.commit()

            return FileResponse(latest, media_type=media_type)

        else:
            return JSONResponse(status_code=400, content={"error": f"Unsupported outputType: {outputType}"})

    except Exception as e:
        print("❌ Conversion failed:", e)
        return JSONResponse(status_code=500, content={"error": str(e)})

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
