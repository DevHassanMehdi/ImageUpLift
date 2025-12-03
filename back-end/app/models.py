# app/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db import Base

class Conversion(Base):
    __tablename__ = "conversions"

    id = Column(Integer, primary_key=True, index=True)
    image_name = Column(String, nullable=False)
    image_type = Column(String, nullable=True)        # e.g. "image/png"
    mode = Column(String, nullable=False)             # "vectorize" | "outline" | "enhance"
    time_taken = Column(Float, nullable=False)        # seconds
    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
