# app/db/models.py
from sqlalchemy import Column, Integer, String, Float, LargeBinary, DateTime
from sqlalchemy.types import JSON
from sqlalchemy.sql import func

from . import Base


class Conversion(Base):
    __tablename__ = "conversions"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, nullable=True)         # kept for legacy references
    image_name = Column(String, nullable=False)
    image_type = Column(String, nullable=True)        # e.g. "image/png"
    mode = Column(String, nullable=False)             # "vectorize" | "outline" | "enhance"
    time_taken = Column(Float, nullable=False)        # seconds
    device = Column(String, nullable=True)            # cpu | gpu
    chosen_params = Column(JSON, nullable=True)       # actual params used for this run
    recommendation_json = Column(JSON, nullable=True) # optional metadata/recommendation snapshot
    output_blob = Column(LargeBinary, nullable=True)
    output_mime = Column(String, nullable=True)
    output_size_bytes = Column(Integer, nullable=True)
    output_thumb_blob = Column(LargeBinary, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
