"""
Utility script to recreate the SQLite database under app/db and seed dummy data.
Run from repo root or back-end with: python -m app.db.create_db
"""
import os
import datetime as dt
import random
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "imageuplift.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"

from . import Base, engine, SessionLocal  # noqa: E402
from . import models  # noqa: E402


def main():
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"Deleted existing DB at {DB_PATH}")

    Base.metadata.create_all(bind=engine)
    session = SessionLocal()

    try:
        random.seed(42)

        # Seed images
        images = []
        for i in range(50):
            fname = f"image_{i:03d}.png" if i % 2 else f"photo_{i:03d}.jpg"
            size = random.randint(10_000, 200_000)
            images.append(
                models.Image(
                    original_filename=fname,
                    size_bytes=size,
                    original_blob=f"fake_blob_{i}".encode(),
                    created_at=dt.datetime.utcnow() - dt.timedelta(days=random.randint(0, 45)),
                )
            )
        session.add_all(images)
        session.flush()

        # Seed recommendations for ~70% of images
        ai_types = ["graphic", "photo", "logo", "illustration"]
        recs = []
        for img in images:
            if random.random() > 0.7:
                continue
            ai_type = random.choice(ai_types)
            metadata = {
                "file_name": img.original_filename,
                "width": random.randint(256, 2048),
                "height": random.randint(256, 2048),
                "aspect_ratio": round(random.uniform(0.5, 2.0), 2),
                "file_size_bytes": img.size_bytes,
                "sharpness": round(random.uniform(500, 6000), 2),
                "color_count": random.randint(16, 2048),
                "edge_complexity": random.randint(50, 1500),
                "ai_image_type": ai_type,
                "ai_confidence": round(random.uniform(0.6, 0.99), 3),
            }
            vector_params = {
                "hierarchical": random.choice(["stacked", "cutout"]),
                "filter_speckle": random.randint(1, 12),
                "color_precision": random.randint(4, 10),
                "gradient_step": random.randint(30, 90),
                "preset": None,
                "mode": random.choice(["spline", "polygon", "pixel"]),
                "corner_threshold": random.randint(20, 80),
                "segment_length": random.randint(5, 20),
                "splice_threshold": random.randint(50, 90),
            }
            outline_params = {"low": random.randint(50, 150), "high": random.randint(160, 260)}
            recs.append(
                models.Recommendation(
                    image_id=img.id,
                    recommended_mode=random.choice(["vectorize", "outline", "enhance"]),
                    vector_params=vector_params,
                    outline_params=outline_params,
                    metadata_json=metadata,
                    confidence_score=metadata["ai_confidence"],
                    created_at=img.created_at,
                )
            )
        session.add_all(recs)

        # Seed conversions
        modes = ["vectorize", "outline", "enhance"]
        devices = ["cpu", "gpu"]
        conversions = []
        for i in range(320):
            mode = random.choice(modes)
            device = random.choice(devices)
            time_taken = round(random.uniform(0.5, 15.0), 2)
            created_at = dt.datetime.utcnow() - dt.timedelta(days=random.randint(0, 45), hours=random.randint(0, 23))
            img = random.choice(images)

            if mode == "vectorize":
                params = {
                    "hierarchical": random.choice(["stacked", "cutout"]),
                    "filter_speckle": random.randint(1, 12),
                    "color_precision": random.randint(4, 10),
                    "gradient_step": random.randint(30, 90),
                    "mode": random.choice(["spline", "polygon"]),
                    "corner_threshold": random.randint(20, 80),
                    "segment_length": random.randint(5, 20),
                    "splice_threshold": random.randint(50, 90),
                }
                output_mime = "image/svg+xml"
                output_size = random.randint(10_000, 120_000)
            elif mode == "outline":
                params = {"low": random.randint(50, 150), "high": random.randint(160, 260)}
                output_mime = "image/svg+xml"
                output_size = random.randint(8_000, 90_000)
            else:  # enhance
                params = {"scale": random.choice([2, 4]), "denoise": random.choice([0, 1])}
                output_mime = random.choice(["image/png", "image/webp"])
                output_size = random.randint(80_000, 500_000)

            conversions.append(
                models.Conversion(
                    image_id=img.id,
                    image_name=img.original_filename,
                    image_type="image/png" if img.original_filename.endswith(".png") else "image/jpeg",
                    mode=mode,
                    time_taken=time_taken,
                    device=device,
                    chosen_params=params,
                    output_size_bytes=output_size,
                    output_mime=output_mime,
                    output_blob=None,  # keep thumbnails empty so gallery uses logo fallback
                    created_at=created_at,
                )
            )

        session.add_all(conversions)
        session.commit()
        print("Database created and seeded with dummy data.")
        print(f"Images: {len(images)}, Recommendations: {len(recs)}, Conversions: {len(conversions)}")
        print(f"DB path: {DB_PATH}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
