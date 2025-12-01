from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, cast, Date
from app.db import get_db
from app import models

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# -----------------------------------------
# 1. SUMMARY
# -----------------------------------------
@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total = db.query(models.Conversion).count()

    # most used mode
    mode_row = (
        db.query(models.Conversion.mode, func.count().label("count"))
        .group_by(models.Conversion.mode)
        .order_by(desc("count"))
        .first()
    )
    most_used_mode = mode_row.mode if mode_row else None

    # average time
    avg_time = db.query(func.avg(models.Conversion.time_taken)).scalar() or 0
    avg_time = round(avg_time, 2)

    # most common image type
    type_row = (
        db.query(models.Conversion.image_type, func.count().label("count"))
        .group_by(models.Conversion.image_type)
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
# 2. MODE USAGE (bar chart)
# -----------------------------------------
@router.get("/mode-usage")
def mode_usage(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Conversion.mode, func.count().label("count"))
        .group_by(models.Conversion.mode)
        .all()
    )

    return {mode: count for mode, count in rows}


# -----------------------------------------
# 3. DAILY TREND (line chart)
# -----------------------------------------
@router.get("/daily-trend")
def daily_trend(db: Session = Depends(get_db)):
    date_expr = func.date(models.Conversion.timestamp)

    rows = (
        db.query(
            date_expr.label("date"),
            func.count(models.Conversion.id).label("count")
        )
        .group_by(date_expr)
        .order_by(date_expr)
        .all()
    )

    return [{"date": r.date, "count": r.count} for r in rows]

# -----------------------------------------
# 4. RECENT CONVERSIONS (table)
# -----------------------------------------
@router.get("/recent")
def recent_conversions(db: Session = Depends(get_db)):
    rows = (
        db.query(
            models.Conversion.image_name,
            models.Conversion.mode,
            models.Conversion.time_taken,
            models.Conversion.timestamp,
        )
        .order_by(models.Conversion.timestamp.desc())
        .limit(5)
        .all()
    )

    return [
        {
            "image_name": r.image_name,
            "mode": r.mode,
            "time_taken": round(r.time_taken, 3),
            "timestamp": r.timestamp.isoformat()
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
            models.Conversion.mode,
            func.avg(models.Conversion.time_taken).label("avg_time")
        )
        .group_by(models.Conversion.mode)
        .all()
    )

    return [{"mode": mode, "avg_time": round(avg, 2)} for mode, avg in rows]

# -----------------------------------------
# 6. PEAK USAGE HOURS
# -----------------------------------------
@router.get("/peak-hours")
def peak_hours(db: Session = Depends(get_db)):
    rows = (
        db.query(
            func.strftime('%H', models.Conversion.timestamp).label("hour"),
            func.count().label("count")
        )
        .group_by("hour")
        .order_by("hour")
        .all()
    )

    return [{"hour": hour, "count": count} for hour, count in rows]
# -----------------------------------------
# 7. IMAGE TYPE DISTRIBUTION
# -----------------------------------------
@router.get("/image-types")
def image_types(db: Session = Depends(get_db)):
    rows = (
        db.query(
            models.Conversion.image_type,
            func.count().label("count")
        )
        .group_by(models.Conversion.image_type)
        .all()
    )
    return [{"type": t, "count": c} for t, c in rows]
# -----------------------------------------
# 8. FASTEST 5 CONVERSIONS
# -----------------------------------------
@router.get("/fastest")
def fastest_conversions(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Conversion)
        .order_by(models.Conversion.time_taken.asc())
        .limit(5)
        .all()
    )

    return [
        {
            "image_name": r.image_name,
            "mode": r.mode,
            "time": round(r.time_taken, 2),
            "timestamp": r.timestamp
        }
        for r in rows
    ]
# -----------------------------------------
# 9. SLOWEST 5 CONVERSIONS
# -----------------------------------------
@router.get("/slowest")
def slowest_conversions(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Conversion)
        .order_by(models.Conversion.time_taken.desc())
        .limit(5)
        .all()
    )

    return [
        {
            "image_name": r.image_name,
            "mode": r.mode,
            "time": round(r.time_taken, 2),
            "timestamp": r.timestamp
        }
        for r in rows
    ]
