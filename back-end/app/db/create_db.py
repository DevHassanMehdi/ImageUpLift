"""
Utility script to recreate the SQLite database under app/db and seed dummy data.
Run from repo root or back-end with: python -m app.db.create_db
"""
import os
import datetime as dt
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "imageuplift.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"

from . import Base, engine, SessionLocal  # noqa: E402
from . import models  # noqa: E402

sample_metadata = {
    "file_name": "1.png",
    "resolution": "41x96",
    "width": 41,
    "height": 96,
    "aspect_ratio": 0.43,
    "file_size_bytes": 1512,
    "sharpness": 3429.15,
    "color_count": 1133,
    "dominant_colors": [
        [255, 255, 255],
        [0, 41, 87],
        [0, 37, 84],
        [0, 40, 86],
        [66, 97, 130],
    ],
    "noise_level": 3429.15,
    "edge_complexity": 380,
    "ai_image_type": "graphic",
    "ai_confidence": 0.9988,
    "ai_raw_probs": {
        "a simple logo or icon on a plain background": 0.325927734375,
        "a flat vectorize illustration or graphic design": 0.046966552734375,
        "a cartoon or character illustration": 0.026336669921875,
        "a watercolor or stylized logo": 0.599609375,
        "a realistic photograph of a person": 0.001194000244140625,
        "a realistic photograph of a landscape or scene": 7.224082946777344e-05,
    },
}


def main():
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"Deleted existing DB at {DB_PATH}")

    # Recreate schema
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()

    try:
        # Seed images
        images = [
            models.Image(
                original_filename="logo_flame.png",
                mime_type="image/png",
                size_bytes=1512,
                width=41,
                height=96,
                aspect_ratio=0.43,
                content_hash="hash_logo1",
                original_blob=b"fake_png_logo_flame",
            ),
            models.Image(
                original_filename="portrait.jpg",
                mime_type="image/jpeg",
                size_bytes=88012,
                width=800,
                height=1200,
                aspect_ratio=800 / 1200,
                content_hash="hash_portrait",
                original_blob=b"fake_jpg_portrait",
            ),
            models.Image(
                original_filename="sketch.webp",
                mime_type="image/webp",
                size_bytes=45022,
                width=640,
                height=640,
                aspect_ratio=1.0,
                content_hash="hash_sketch",
                original_blob=b"fake_webp_sketch",
            ),
        ]
        session.add_all(images)
        session.flush()  # populate IDs

        # Recommendation snapshot for first image
        rec = models.Recommendation(
            image_id=images[0].id,
            recommended_mode="vectorize",
            vector_params={
                "hierarchical": "stacked",
                "filter_speckle": 8,
                "color_precision": 6,
                "gradient_step": 60,
                "preset": None,
                "mode": "spline",
                "corner_threshold": 40,
                "segment_length": 10,
                "splice_threshold": 80,
            },
            outline_params={"low": 100, "high": 200},
            metadata_json=sample_metadata,
            confidence_score=0.92,
            recommender_version="v1-seed",
        )
        session.add(rec)

        now = dt.datetime.utcnow()

        # Seed conversions
        conversions = [
            models.Conversion(
                image_id=images[0].id,
                image_name=images[0].original_filename,
                image_type=images[0].mime_type,
                mode="vectorize",
                time_taken=60.2,
                started_at=now,
                ended_at=now + dt.timedelta(seconds=60),
                duration_sec=60.2,
                status="success",
                device="cpu",
                chosen_params={
                    "hierarchical": "stacked",
                    "filter_speckle": 8,
                    "color_precision": 6,
                    "gradient_step": 60,
                    "mode": "spline",
                    "corner_threshold": 40,
                    "segment_length": 10,
                    "splice_threshold": 80,
                },
                output_mime="image/svg+xml",
                output_size_bytes=20480,
                output_hash="out_hash_logo1",
                output_blob=b"fake_svg_output_logo1",
            ),
            models.Conversion(
                image_id=images[1].id,
                image_name=images[1].original_filename,
                image_type=images[1].mime_type,
                mode="enhance",
                time_taken=12.5,
                started_at=now + dt.timedelta(minutes=5),
                ended_at=now + dt.timedelta(minutes=5, seconds=12),
                duration_sec=12.5,
                status="success",
                device="gpu",
                chosen_params={"scale": 4},
                output_mime="image/png",
                output_size_bytes=345678,
                output_hash="out_hash_portrait",
                output_blob=b"fake_png_output_portrait",
            ),
            models.Conversion(
                image_id=images[2].id,
                image_name=images[2].original_filename,
                image_type=images[2].mime_type,
                mode="outline",
                time_taken=8.9,
                started_at=now + dt.timedelta(minutes=10),
                ended_at=now + dt.timedelta(minutes=10, seconds=9),
                duration_sec=8.9,
                status="fail",
                failure_reason="Potrace missing",
                device="cpu",
                chosen_params={"low": 80, "high": 180},
                output_mime="image/svg+xml",
                output_size_bytes=0,
                output_hash=None,
                output_blob=None,
            ),
        ]

        session.add_all(conversions)
        session.commit()
        print("Database created and seeded with dummy data.")
        print(f"Images: {len(images)}, Conversions: {len(conversions)}, Recommendations: 1")
        print(f"DB path: {DB_PATH}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
