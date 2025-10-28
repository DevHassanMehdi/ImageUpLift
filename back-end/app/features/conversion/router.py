from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
import tempfile, os, torch
from app.features.conversion.vectorization import process_image

router = APIRouter(prefix="/conversion", tags=["Conversion"])

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
    colorReduction: str = Form("auto")
):
    """
    Receives image + conversion settings and runs the correct pipeline.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        class Args:
            input = tmp_path
            output = "app/output"
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
        os.makedirs(args.output, exist_ok=True)
        device = "cuda" if torch.cuda.is_available() else "cpu"

        if outputType.lower() == "vector":
            process_image(tmp_path, args, device)

            svg_files = sorted(
                [f for f in os.listdir(args.output) if f.endswith(".svg")],
                key=lambda f: os.path.getmtime(os.path.join(args.output, f)),
                reverse=True
            )
            if not svg_files:
                raise RuntimeError("No SVG output generated.")
            return FileResponse(os.path.join(args.output, svg_files[0]), media_type="image/svg+xml")

        elif outputType.lower() == "outline":
            return JSONResponse({"status": "pending", "message": "Outline mode not implemented yet."})

        elif outputType.lower() == "enhance":
            return JSONResponse({"status": "pending", "message": "Enhance mode not implemented yet."})

        else:
            return JSONResponse(status_code=400, content={"error": f"Unsupported outputType: {outputType}"})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
