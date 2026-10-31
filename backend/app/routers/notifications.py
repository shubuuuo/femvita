import datetime as dt

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import cycle_logic as logic
from ..database import get_db
from ..deps import get_current_user_id, get_today
from ..models import DailyLog
from ..schemas import NotificationList, NotificationOut
from .cycle import load_model
from .preferences import load_preferences

router = APIRouter(prefix="/api/notifications")

HEADS_UP_DAYS = 3  # how far ahead to warn about the period or fertile window


def days(n: int) -> str:
    return f"{n} day{'' if n == 1 else 's'}"


@router.get("", response_model=NotificationList)
def list_notifications(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    s = logic.summarize(load_model(db, user_id), today)
    items: list[NotificationOut] = []
    prefs = load_preferences(db, user_id)

    if s["has_data"] and prefs.cycle_alerts:
        day, late, nxt = s["cycle_day"], s["days_late"], s["next_period_in"]
        if late > 0:
            items.append(NotificationOut(kind="period", href="/cycle-tracker",
                                         text=f"Your period is {days(late)} later than estimated"))
        else:
            if nxt == 0:
                items.append(NotificationOut(kind="period", href="/cycle-tracker", text="Your period is expected today"))
            elif nxt <= HEADS_UP_DAYS:
                items.append(NotificationOut(kind="period", href="/cycle-tracker", text=f"Period predicted in {days(nxt)}"))

            to_window = s["fertile_start"] - day
            if to_window == 0:
                items.append(NotificationOut(kind="fertile", href="/cycle-tracker",
                                             text="Your estimated fertile window starts today"))
            elif 0 < to_window <= HEADS_UP_DAYS:
                items.append(NotificationOut(kind="fertile", href="/cycle-tracker",
                                             text=f"Your estimated fertile window opens in {days(to_window)}"))
            if day == s["ovulation_day"]:
                items.append(NotificationOut(kind="ovulation", href="/cycle-tracker",
                                             text="Estimated ovulation is today"))

    if prefs.log_reminder:
        logged_today = db.scalar(
            select(DailyLog.id).where(DailyLog.user_id == user_id, DailyLog.log_date == today)
        )
        if logged_today is None:
            items.append(NotificationOut(kind="log", href="/cycle-tracker", text="You haven't logged anything today"))

    return NotificationList(items=items)