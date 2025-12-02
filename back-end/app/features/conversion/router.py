import io
import os
import tempfile
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse, StreamingResponse
import torch
import subprocess
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.features.helpers.recommend_settings import extract_image_metadata, recommend_conversion
from app.db import get_db
from app.db import models


router = APIRouter(prefix="/conversion", tags=["Conversion"])


@router.get("/")
def get_conversion_info():
    return {"message": "This is the conversion feature endpoint."}


@router.options("/convert")
async def options_convert():
    return JSONResponse({"message": "CORS preflight OK"}, status_code=200)


@router.post("/recommend")
async def recommend_settings(file: UploadFile = File(...)):
    """
    Accepts an image file, extracts metadata, and returns suggested settings (no DB writes).
    """
    upload_bytes = await file.read()
    if not upload_bytes:
        return JSONResponse(status_code=400, content={"error": "Empty file"})

    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        tmp.write(upload_bytes)
        tmp_path = Path(tmp.name)

    try:
        metadata = extract_image_metadata(str(tmp_path))
        recommendation = recommend_conversion(metadata)
        return {"metadata": metadata, "recommendation": recommendation}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to compute recommendation", "details": str(e)},
        )
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


@router.post("/convert")
async def convert_image(
    file: UploadFile = File(...),
    outputType: str = Form("vectorize"),  # 'vectorize', 'outline', 'enhance'
    # outline fields
    low: int = Form(100),
    high: int = Form(200),
    # vectorize fields
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
    Receives image + conversion settings, runs pipeline, stores original/output blobs + metadata, returns output bytes.
    """
    upload_bytes = await file.read()
    if not upload_bytes:
        return JSONResponse(status_code=400, content={"error": "Empty file"})

    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        tmp.write(upload_bytes)
        tmp_path = Path(tmp.name)

    output_dir = Path("app/output")
    output_dir.mkdir(parents=True, exist_ok=True)

    start_perf = time.perf_counter()
    output_path = None
    output_bytes = None
    output_mime = None
    device = "gpu" if torch.cuda.is_available() else "cpu"
    failure_reason = None
    recommendation_json = None

    # Precompute recommendation/metadata to store alongside conversion
    try:
        metadata = extract_image_metadata(str(tmp_path))
        recommendation = recommend_conversion(metadata)
        recommendation_json = {
            "metadata": metadata,
            "recommendation": recommendation,
        }
    except Exception as e:
        recommendation_json = {"error": str(e)}

    chosen_params = {
        "outputType": outputType,
        "hierarchical": hierarchical,
        "filter_speckle": filter_speckle,
        "color_precision": color_precision,
        "gradient_step": gradient_step,
        "preset": preset,
        "mode": mode,
        "corner_threshold": corner_threshold,
        "segment_length": segment_length,
        "splice_threshold": splice_threshold,
        "low": low,
        "high": high,
    }

    try:
        original_name = Path(file.filename).stem if file.filename else "upload"

        if outputType.lower() == "vectorize":
            cmd = [
                "python",
                "app/features/conversion/vectorization.py",
                "--input",
                str(tmp_path),
                "--output",
                str(output_dir),
                "--base_name",
                original_name,
                "--hierarchical",
                hierarchical,
                "--filter_speckle",
                str(filter_speckle),
                "--color_precision",
                str(color_precision),
                "--gradient_step",
                str(gradient_step),
                "--mode",
                mode,
            ]
            if preset:
                cmd.extend(["--preset", preset])
            if mode == "spline":
                cmd.extend(
                    [
                        "--corner_threshold",
                        str(corner_threshold),
                        "--segment_length",
                        str(segment_length),
                        "--splice_threshold",
                        str(splice_threshold),
                    ]
                )

            subprocess.run(cmd, check=True)

            svg_files = sorted(
                [f for f in output_dir.iterdir() if f.suffix == ".svg"],
                key=lambda f: f.stat().st_mtime,
                reverse=True,
            )
            if not svg_files:
                raise RuntimeError("No SVG output generated.")
            output_path = svg_files[0]
            output_mime = "image/svg+xml"

        elif outputType.lower() == "outline":
            try:
                from app.features.conversion.outline import process_image as outline_process
            except ImportError:
                outline_process = None

            if outline_process is None:
                raise RuntimeError("Outline processor not available")

            outline_process(str(tmp_path), str(output_dir), low, high, base_name_override=original_name)

            svg_files = sorted(
                [
                    f
                    for f in output_dir.iterdir()
                    if f.suffix == ".svg" and ("_outline_" in f.name or f.name.endswith("_outline.svg"))
                ],
                key=lambda f: f.stat().st_mtime,
                reverse=True,
            )
            if not svg_files:
                raise RuntimeError("No outline SVG output generated.")
            output_path = svg_files[0]
            output_mime = "image/svg+xml"

        elif outputType.lower() == "enhance":
            args = [
                "python",
                "app/features/conversion/enhance.py",
                "--input",
                str(tmp_path),
                "--output",
                str(output_dir),
                "--model_path",
                "app/weights/RealESRGAN_x4plus.pth",
                "--base_name",
                original_name,
            ]
            subprocess.run(args, check=True)

            upscaled_files = sorted(
                [f for f in output_dir.iterdir() if f.suffix in {".png", ".webp"} and "_real_upscaled" in f.name],
                key=lambda f: f.stat().st_mtime,
                reverse=True,
            )
            if not upscaled_files:
                raise RuntimeError("No upscaled image found.")
            output_path = upscaled_files[0]
            output_mime = "image/webp" if output_path.suffix == ".webp" else "image/png"

        else:
            return JSONResponse(status_code=400, content={"error": f"Unsupported outputType: {outputType}"})

        # Read output into memory
        if output_path:
            output_bytes = output_path.read_bytes()

    except Exception as e:
        failure_reason = str(e)
    finally:
        duration = time.perf_counter() - start_perf

        output_size = len(output_bytes) if output_bytes else None
        conv_entry = models.Conversion(
            image_id=None,
            image_name=file.filename or "upload",
            image_type=file.content_type,
            mode=outputType.lower(),
            time_taken=duration,
            device=device,
            chosen_params=chosen_params,
            recommendation_json=recommendation_json,
            output_mime=output_mime,
            output_size_bytes=output_size,
            output_blob=output_bytes,
        )
        try:
            db.add(conv_entry)
            db.commit()
        except Exception:
            db.rollback()

        # Cleanup temp + output file
        if output_path and output_path.exists():
            try:
                output_path.unlink()
            except OSError:
                pass
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass

    if not output_bytes:
        return JSONResponse(status_code=500, content={"error": failure_reason or "Conversion failed"})

    filename = f"{Path(file.filename or 'converted').stem}_output{Path(output_path).suffix if output_path else ''}"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(io.BytesIO(output_bytes), media_type=output_mime or "application/octet-stream", headers=headers)


@router.get("/list")
def list_conversions(limit: int = 50, mode: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns a paginated list of recent conversions for gallery/analytics use.
    Optional filter by mode.
    """
    q = db.query(models.Conversion)
    if mode:
        q = q.filter(func.lower(models.Conversion.mode) == mode.lower())
    rows = (
        q.order_by(desc(models.Conversion.created_at))
        .limit(min(limit, 200))
        .all()
    )
    return [
        {
            "id": r.id,
            "image_name": r.image_name,
            "mode": r.mode,
            "chosen_params": r.chosen_params,
            "output_size_bytes": r.output_size_bytes,
            "output_mime": r.output_mime,
        }
        for r in rows
    ]


@router.get("/detail/{conversion_id}")
def conversion_detail(conversion_id: int, db: Session = Depends(get_db)):
    """
    Returns metadata plus URLs for original/output to hydrate gallery/preview.
    """
    conv = db.query(models.Conversion).filter(models.Conversion.id == conversion_id).first()
    if not conv:
        return JSONResponse(status_code=404, content={"error": "Conversion not found"})

    return {
        "id": conv.id,
        "image_name": conv.image_name,
        "mode": conv.mode,
        "chosen_params": conv.chosen_params,
        "device": conv.device,
        "output_size_bytes": conv.output_size_bytes,
        "output_mime": conv.output_mime,
        "output_url": f"/conversion/output/{conv.id}",
        "original_url": None,
    }


@router.get("/output/{conversion_id}")
def get_conversion_output(conversion_id: int, db: Session = Depends(get_db)):
    conv = db.query(models.Conversion).filter(models.Conversion.id == conversion_id).first()
    if not conv or not conv.output_blob:
        return JSONResponse(status_code=404, content={"error": "Output not found"})
    mime = conv.output_mime or ("image/svg+xml" if conv.mode in {"vectorize", "outline"} else "image/png")
    ext = mime.split("/")[-1] if "/" in mime else "bin"
    safe_name = conv.image_name or "output"
    headers = {"Content-Disposition": f'inline; filename="{safe_name}.{ext}"'}
    return StreamingResponse(io.BytesIO(conv.output_blob), media_type=mime, headers=headers)


@router.delete("/{conversion_id}")
def delete_conversion(conversion_id: int, db: Session = Depends(get_db)):
    conv = db.query(models.Conversion).filter(models.Conversion.id == conversion_id).first()
    if not conv:
        return JSONResponse(status_code=404, content={"error": "Conversion not found"})
    db.delete(conv)
    db.commit()

    return {"deleted": True, "id": conversion_id}
