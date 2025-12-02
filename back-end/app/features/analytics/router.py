from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.db import get_db
from app.db.models import Conversion

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# -----------------------------------------
# 1. SUMMARY
# -----------------------------------------
@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total = db.query(Conversion).count()

    mode_row = (
        db.query(Conversion.mode, func.count().label("count"))
        .group_by(Conversion.mode)
        .order_by(desc("count"))
        .first()
    )
    most_used_mode = mode_row.mode if mode_row else None

    avg_time = db.query(func.avg(Conversion.time_taken)).scalar() or 0
    avg_time = round(avg_time, 2)

    type_row = (
        db.query(Conversion.image_type, func.count().label("count"))
        .group_by(Conversion.image_type)
        .order_by(desc("count"))
        .first()
    )
    common_type = type_row.image_type if type_row else None

    return {
        "total_images": total,
        "most_used_mode": most_used_mode,
        "avg_processing_time": avg_time,
        "common_image_type": common_type,
    }


# -----------------------------------------
# 2. MODE USAGE
# -----------------------------------------
@router.get("/mode-usage")
def mode_usage(db: Session = Depends(get_db)):
    rows = (
        db.query(Conversion.mode, func.count().label("count"))
        .group_by(Conversion.mode)
        .all()
    )
    return {mode: count for mode, count in rows}


# -----------------------------------------
# 3. DAILY TREND
# -----------------------------------------
@router.get("/daily-trend")
def daily_trend(db: Session = Depends(get_db)):
    date_expr = func.date(Conversion.created_at)   # FIXED

    rows = (
        db.query(
            date_expr.label("date"),
            func.count(Conversion.id).label("count")
        )
        .group_by(date_expr)
        .order_by(date_expr)
        .all()
    )
    return [{"date": r.date, "count": r.count} for r in rows]


# -----------------------------------------
# 5. TIME BY MODE
# -----------------------------------------
@router.get("/time-by-mode")
def time_by_mode(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Conversion.mode,
            func.avg(Conversion.time_taken).label("avg_time")
        )
        .group_by(Conversion.mode)
        .all()
    )
    return [{"mode": mode, "avg_time": round(avg, 2)} for mode, avg in rows]


# -----------------------------------------
# 6. PEAK HOURS
# -----------------------------------------
@router.get("/peak-hours")
def peak_hours(db: Session = Depends(get_db)):
    rows = (
        db.query(
            func.strftime('%H', Conversion.created_at).label("hour"),   # FIXED
            func.count().label("count")
        )
        .group_by("hour")
        .order_by("hour")
        .all()
    )
    return [{"hour": hour, "count": count} for hour, count in rows]


# -----------------------------------------
# 7. IMAGE TYPES (via recommendation_json metadata.ai_image_type if present)
# -----------------------------------------
@router.get("/image-types")
def image_types(db: Session = Depends(get_db)):
    rows = db.query(Conversion.recommendation_json).all()
    buckets = {}
    for (rec,) in rows:
        if not rec:
            continue
        meta = rec.get("metadata") or {}
        ctype = meta.get("ai_image_type") or "unknown"
        buckets[ctype] = buckets.get(ctype, 0) + 1
    return [{"type": t, "count": c} for t, c in buckets.items()]


# -----------------------------------------
# 12. OUTPUT SIZE BY MODE
# -----------------------------------------
@router.get("/output-size-by-mode")
def output_size_by_mode(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Conversion.mode,
            func.avg(Conversion.output_size_bytes).label("avg_size")
        )
        .group_by(Conversion.mode)
        .all()
    )
    return [
        {"mode": mode, "avg_size": round((avg or 0) / (1024 * 1024), 3)}  # MB
        for mode, avg in rows
    ]


# -----------------------------------------
