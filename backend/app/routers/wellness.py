import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user_id, get_today
from ..cycle_logic import build_model, locate, phase_for
from ..models import ChallengeCheckin, DailyLog
from ..schemas import (
    ChallengeDay,
    ChallengeOut,
    CheckinIn,
    HealthTopicsOut,
    MealDetail,
    Move,
    NutritionOut,
    Phase,
)
from ..services import medlineplus, themealdb, wger

router = APIRouter(prefix="/api/wellness")

# This week's challenge. Later this can move into a database table so it rotates.
CHALLENGE = {
    "slug": "stay-hydrated",
    "title": "Stay Hydrated",
    "description": "Drink enough water every day this week.",
}


def week_start_of(today: dt.date) -> dt.date:
    return today - dt.timedelta(days=today.weekday())  # Monday


def build_challenge(db: Session, user_id: int, today: dt.date) -> ChallengeOut:
    start = week_start_of(today)
    done_days = set(
        db.scalars(
            select(ChallengeCheckin.day).where(
                ChallengeCheckin.user_id == user_id,
                ChallengeCheckin.challenge_slug == CHALLENGE["slug"],
                ChallengeCheckin.day.between(start, start + dt.timedelta(days=6)),
            )
        ).all()
    )
    days = []
    for i in range(7):
        d = start + dt.timedelta(days=i)
        days.append(
            ChallengeDay(date=d, done=d in done_days, is_today=d == today, is_future=d > today)
        )
    return ChallengeOut(**CHALLENGE, week_start=start, completed=len(done_days), target=7, days=days)


@router.get("/challenge", response_model=ChallengeOut)
def get_challenge(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    return build_challenge(db, user_id, today)


@router.put("/challenge/checkin/{day}", response_model=ChallengeOut)
def set_checkin(
    day: dt.date,
    payload: CheckinIn,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    if day > today:
        raise HTTPException(status_code=400, detail="You can't check in on a future day")
    if day < week_start_of(today):
        raise HTTPException(status_code=400, detail="That day isn't part of this week's challenge")

    row = db.scalar(
        select(ChallengeCheckin).where(
            ChallengeCheckin.user_id == user_id,
            ChallengeCheckin.challenge_slug == CHALLENGE["slug"],
            ChallengeCheckin.day == day,
        )
    )
    try:
        if payload.done and row is None:
            db.add(ChallengeCheckin(user_id=user_id, challenge_slug=CHALLENGE["slug"], day=day))
            db.commit()
        elif not payload.done and row is not None:
            db.delete(row)
            db.commit()
    except IntegrityError:  # a double-click raced us; the day is already saved
        db.rollback()

    return build_challenge(db, user_id, today)


# ---------------- MedlinePlus (knowledge base) ----------------
@router.get("/health-topics", response_model=HealthTopicsOut)
def health_topics(q: str = Query(min_length=2, max_length=60)):
    term = q.strip()
    return HealthTopicsOut(term=term, topics=medlineplus.search_topics(term))


# ---------------- TheMealDB (nutrition) ----------------
def detect_phase(db: Session, user_id: int, today: dt.date) -> str | None:
    """Current cycle phase from the user's logged flow days, or None if there's nothing to go on yet."""
    flow_dates = db.scalars(
        select(DailyLog.log_date).where(DailyLog.user_id == user_id, DailyLog.flow.is_not(None))
    ).all()
    model = build_model(list(flow_dates))
    loc = locate(model, today)
    if loc is None:
        return None
    cycle_day, cycle_len = loc
    return phase_for(cycle_day, cycle_len, model.avg_period)


@router.get("/nutrition", response_model=NutritionOut)
def nutrition(
    phase: Phase | None = None,
    vegetarian: bool = False,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    detected = detect_phase(db, user_id, today)
    chosen = phase or detected or "follicular"  # no logs yet: show something rather than nothing
    info = themealdb.PHASES[chosen]
    return NutritionOut(
        phase=chosen,
        label=info["label"],
        why=info["why"],
        detected=chosen == detected,
        meals=themealdb.meals_for_phase(chosen, today, vegetarian),
    )


@router.get("/meals/{meal_id}", response_model=MealDetail)
def meal(meal_id: str = Path(pattern=r"^\d{1,10}$")):
    detail = themealdb.meal_detail(meal_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return detail


# ---------------- wger (fitness) ----------------
@router.get("/moves", response_model=list[Move])
def moves():
    return wger.morning_moves()