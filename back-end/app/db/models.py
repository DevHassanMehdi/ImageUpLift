# app/db/models.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey, LargeBinary, DateTime
from sqlalchemy.types import JSON
from sqlalchemy.sql import func

from . import Base


class Image(Base):
    """
    Stores the original uploaded image (raw blob + minimal metadata).
    """
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=True)
    original_blob = Column(LargeBinary, nullable=True)
    # Optional helper to know when row was created
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Recommendation(Base):
    """
    Snapshot of recommendation output for an image (metadata + suggested settings).
    """
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=True)
    recommended_mode = Column(String, nullable=True)  # vectorize | outline | enhance
    vector_params = Column(JSON, nullable=True)       # dict of vector settings
    outline_params = Column(JSON, nullable=True)      # dict with low/high, etc.
    metadata_json = Column(JSON, nullable=True)       # full metadata payload from analysis
    confidence_score = Column(Float, nullable=True)
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
    time_taken = Column(Float, nullable=False)        # seconds
    device = Column(String, nullable=True)            # cpu | gpu
    chosen_params = Column(JSON, nullable=True)       # actual params used for this run
    output_blob = Column(LargeBinary, nullable=True)
    output_mime = Column(String, nullable=True)
    output_size_bytes = Column(Integer, nullable=True)
    output_thumb_blob = Column(LargeBinary, nullable=True)
    # Optional created timestamp for ordering
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
