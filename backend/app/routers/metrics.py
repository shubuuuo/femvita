import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user_id, get_today
from ..models import DailyMetric
from ..schemas import Goals, MetricDay, MetricsIn, MetricsWeek, WaterIn

router = APIRouter(prefix="/api/metrics")

# Placeholder goals for everyone. They can move into a per-user settings table later.
GOALS = Goals(sleep_minutes=480, steps=10_000, hydration_ml=2_500)
MAX_WATER = 10_000     # must match the CHECK constraint
EDITABLE_DAYS = 60     # how far back sleep and steps can be entered


def build_week(db: Session, user_id: int, today: dt.date) -> MetricsWeek:
    start = today - dt.timedelta(days=6)
    rows = {
        r.day: r
        for r in db.scalars(
            select(DailyMetric).where(DailyMetric.user_id == user_id, DailyMetric.day.between(start, today))
        )
    }
    days = []
    for i in range(7):
        d = start + dt.timedelta(days=i)
        r = rows.get(d)
        days.append(
            MetricDay(
                date=d,
                sleep_minutes=r.sleep_minutes if r else None,
                steps=r.steps if r else None,
                hydration_ml=r.hydration_ml if r else 0,
            )
        )
    return MetricsWeek(goals=GOALS, days=days)


@router.get("/week", response_model=MetricsWeek)
def get_week(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    return build_week(db, user_id, today)


@router.post("/water", response_model=MetricsWeek)
def add_water(
    payload: WaterIn,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    if payload.ml == 0:
        raise HTTPException(status_code=400, detail="Amount can't be zero")
    # One atomic "insert, or add to the existing total" statement, so double-clicks and two open
    # tabs can't overwrite each other. The total is clamped to 0..MAX_WATER inside the database.
    stmt = pg_insert(DailyMetric).values(
        user_id=user_id, day=today, hydration_ml=min(max(payload.ml, 0), MAX_WATER)
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "day"],
        set_={
            "hydration_ml": func.greatest(0, func.least(MAX_WATER, DailyMetric.hydration_ml + payload.ml)),
            "updated_at": func.now(),
        },
    )
    db.execute(stmt)
    db.commit()
    return build_week(db, user_id, today)


@router.put("/{day}", response_model=MetricsWeek)
def set_sleep_and_steps(
    day: dt.date,
    payload: MetricsIn,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    """Sets sleep and steps for one day (null clears a value). Water is untouched: it only changes via /water."""
    if day > today:
        raise HTTPException(status_code=400, detail="You can't log a future date")
    if day < today - dt.timedelta(days=EDITABLE_DAYS):
        raise HTTPException(status_code=400, detail="That date is too far back to edit")

    stmt = pg_insert(DailyMetric).values(
        user_id=user_id, day=day, sleep_minutes=payload.sleep_minutes, steps=payload.steps
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "day"],
        set_={"sleep_minutes": stmt.excluded.sleep_minutes, "steps": stmt.excluded.steps, "updated_at": func.now()},
    )
    db.execute(stmt)
    db.commit()
    return build_week(db, user_id, today)