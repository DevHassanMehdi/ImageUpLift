from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
import tempfile, os, torch, subprocess
from app.features.conversion.vectorization import process_image
from app.features.conversion.outline import process_image as outline_process
from app.features.conversion.enhance import main as enhance_main  # 👈 import your enhance script

router = APIRouter(prefix="/conversion", tags=["Conversion"])

# Optional simple info endpoint
@router.get("/")
def get_conversion_info():
    return {"message": "This is the conversion feature endpoint."}

# ✅ Optional: explicitly allow OPTIONS for browsers that need it
@router.options("/convert")
async def options_convert():
    return JSONResponse({"message": "CORS preflight OK"}, status_code=200)

@router.post("/convert")
async def convert_image(
    file: UploadFile = File(...),
    outputType: str = Form("vector"),  # 'vector', 'outline', 'enhance'
    quality: str = Form("balanced"),
    detail: int = Form(75),
    colorReduction: str = Form("auto"),
    low: int = Form(100),
    high: int = Form(200)
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

        # ✅ VECTOR mode
        if outputType.lower() == "vector":
            class Args:
                input = tmp_path
                output = output_dir
                model_path = "app/weights/RealESRGAN_x4plus_anime_6B.pth"
                scale = 4
                quality_threshold = 5500.0
                mode = "spline"
                color_precision = 6
                filter_speckle = 16
                hierarchical = "stacked"
                corner_threshold = 40
                gradient_step = 60
                segment_length = 10
                splice_threshold = 80
                path_precision = 1

            args = Args()
            process_image(tmp_path, args, device)

            svg_files = sorted(
                [f for f in os.listdir(output_dir) if f.endswith(".svg")],
                key=lambda f: os.path.getmtime(os.path.join(output_dir, f)),
                reverse=True
            )
            if not svg_files:
                raise RuntimeError("No SVG output generated.")
            return FileResponse(os.path.join(output_dir, svg_files[0]), media_type="image/svg+xml")

        # ✅ OUTLINE mode
        elif outputType.lower() == "outline":
            try:
                outline_process(tmp_path, output_dir, low, high)
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
                [f for f in os.listdir(output_dir) if f.endswith("_outline.svg")],
                key=lambda f: os.path.getmtime(os.path.join(output_dir, f)),
                reverse=True
            )
            if not svg_files:
                raise RuntimeError("No outline SVG output generated.")
            return FileResponse(os.path.join(output_dir, svg_files[0]), media_type="image/svg+xml")

        # ✅ ENHANCE mode
        elif outputType.lower() == "enhance":
            # Prepare CLI args for your RealESRGAN-based script
            args = [
                "python", "app/features/conversion/enhance.py",
                "--input", tmp_path,
                "--output", output_dir,
                "--model_path", "app/weights/RealESRGAN_x4plus.pth"
            ]

            try:
                subprocess.run(args, check=True)
            except subprocess.CalledProcessError as e:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Enhance process failed", "details": str(e)},
                )

            # Return the latest upscaled image
            upscaled_files = sorted(
                [f for f in os.listdir(output_dir) if f.endswith("_real_upscaled.png") or f.endswith("_real_upscaled.webp")],
                key=lambda f: os.path.getmtime(os.path.join(output_dir, f)),
                reverse=True
            )
            if not upscaled_files:
                raise RuntimeError("No upscaled image found.")
            latest = os.path.join(output_dir, upscaled_files[0])
            media_type = "image/webp" if latest.endswith(".webp") else "image/png"
            return FileResponse(latest, media_type=media_type)

        else:
            return JSONResponse(status_code=400, content={"error": f"Unsupported outputType: {outputType}"})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
