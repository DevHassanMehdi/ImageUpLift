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
# 4. RECENT
# -----------------------------------------
@router.get("/recent")
def recent_conversions(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Conversion.image_name,
            Conversion.mode,
            Conversion.time_taken,
            Conversion.created_at,        # FIXED
        )
        .order_by(Conversion.created_at.desc())
        .limit(5)
        .all()
    )

    return [
        {
            "image_name": r.image_name,
            "mode": r.mode,
            "time_taken": round(r.time_taken, 3),
            "timestamp": r.created_at.isoformat()
        }
        for r in rows
    ]


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
# 7. IMAGE TYPES
# -----------------------------------------
@router.get("/image-types")
def image_types(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Conversion.image_type,
            func.count().label("count")
        )
        .group_by(Conversion.image_type)
        .all()
    )
    return [{"type": t, "count": c} for t, c in rows]


# -----------------------------------------
# 8. FASTEST
# -----------------------------------------
@router.get("/fastest")
def fastest_conversions(db: Session = Depends(get_db)):
    rows = (
        db.query(Conversion)
        .order_by(Conversion.time_taken.asc())
        .limit(5)
        .all()
    )
    return [
        {
            "image_name": r.image_name,
            "mode": r.mode,
            "time": round(r.time_taken, 2),
            "timestamp": r.created_at   # FIXED
        }
        for r in rows
    ]


# -----------------------------------------
# 9. SLOWEST
# -----------------------------------------
@router.get("/slowest")
def slowest_conversions(db: Session = Depends(get_db)):
    rows = (
        db.query(Conversion)
        .order_by(Conversion.time_taken.desc())
        .limit(5)
        .all()
    )
    return [
        {
            "image_name": r.image_name,
            "mode": r.mode,
            "time": round(r.time_taken, 2),
            "timestamp": r.created_at   # FIXED
        }
        for r in rows
    ]
