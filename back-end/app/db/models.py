# app/db/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, LargeBinary
from sqlalchemy.types import JSON
from sqlalchemy.sql import func

from . import Base


class Image(Base):
    """
    Stores the original uploaded image (and optional thumbnail) plus basic metadata.
    """
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    aspect_ratio = Column(Float, nullable=True)
    content_hash = Column(String, nullable=True)  # SHA-256 or similar
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    original_blob = Column(LargeBinary, nullable=True)
    thumb_blob = Column(LargeBinary, nullable=True)
    thumb_mime = Column(String, nullable=True)
    thumb_size = Column(Integer, nullable=True)


class Recommendation(Base):
    """
    Snapshot of recommendation output for an image (metadata + suggested settings).
    Kept independent from conversions so analytics can compare suggested vs chosen.
    """
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=True)
    recommended_mode = Column(String, nullable=True)  # vectorize | outline | enhance
    vector_params = Column(JSON, nullable=True)       # dict of vector settings
    outline_params = Column(JSON, nullable=True)      # dict with low/high, etc.
    # NOTE: "metadata" is reserved by SQLAlchemy Declarative; use metadata_json instead.
    metadata_json = Column(JSON, nullable=True)       # full metadata payload from analysis
    confidence_score = Column(Float, nullable=True)
    recommender_version = Column(String, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Conversion(Base):
    __tablename__ = "conversions"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=True)
    image_name = Column(String, nullable=False)
    image_type = Column(String, nullable=True)        # e.g. "image/png"
    mode = Column(String, nullable=False)             # "vectorize" | "outline" | "enhance"
    time_taken = Column(Float, nullable=False)        # seconds (legacy; prefer duration_sec)

    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_sec = Column(Float, nullable=True)
    status = Column(String, nullable=True)            # success | fail
    failure_reason = Column(String, nullable=True)
    device = Column(String, nullable=True)            # cpu | gpu
    chosen_params = Column(JSON, nullable=True)       # actual params used for this run

    output_mime = Column(String, nullable=True)
    output_size_bytes = Column(Integer, nullable=True)
    output_hash = Column(String, nullable=True)
    output_blob = Column(LargeBinary, nullable=True)
    output_thumb_blob = Column(LargeBinary, nullable=True)
    output_thumb_mime = Column(String, nullable=True)
    output_thumb_size = Column(Integer, nullable=True)

    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
