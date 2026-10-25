import datetime as dt
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import cycle_logic as logic
from ..database import get_db
from ..deps import get_current_user_id, get_today
from ..models import DailyLog
from ..schemas import BbtPoint, DayInfo, LogIn, LogOut, Summary

router = APIRouter(prefix="/api")


def load_model(db: Session, user_id: int) -> logic.CycleModel:
    flow_dates = db.scalars(
        select(DailyLog.log_date).where(DailyLog.user_id == user_id, DailyLog.flow.is_not(None))
    ).all()
    return logic.build_model(list(flow_dates))


@router.get("/cycle/summary", response_model=Summary)
def cycle_summary(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    return Summary(**logic.summarize(load_model(db, user_id), today))


@router.get("/cycle/calendar", response_model=list[DayInfo])
def cycle_calendar(
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    model = load_model(db, user_id)
    n_days = monthrange(year, month)[1]
    first = dt.date(year, month, 1)
    logs = {
        row.log_date: row
        for row in db.scalars(
            select(DailyLog).where(
                DailyLog.user_id == user_id,
                DailyLog.log_date.between(first, first + dt.timedelta(days=n_days - 1)),
            )
        )
    }
    days = []
    for i in range(n_days):
        d = first + dt.timedelta(days=i)
        row = logs.get(d)
        flow_logged = bool(row and row.flow)
        days.append(
            DayInfo(
                date=d,
                is_period=flow_logged,
                log=LogOut.model_validate(row) if row else None,
                **logic.classify(model, d, today, flow_logged),
            )
        )
    return days


@router.get("/cycle/bbt", response_model=list[BbtPoint])
def bbt_trend(
    days: int = Query(30, ge=7, le=180),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    model = load_model(db, user_id)
    rows = db.scalars(
        select(DailyLog)
        .where(
            DailyLog.user_id == user_id,
            DailyLog.bbt.is_not(None),
            DailyLog.log_date >= today - dt.timedelta(days=days),
        )
        .order_by(DailyLog.log_date)
    ).all()
    result = []
    for r in rows:
        loc = logic.locate(model, r.log_date)
        result.append(BbtPoint(date=r.log_date, bbt=r.bbt, cycle_day=loc[0] if loc else None))
    return result


@router.put("/logs/{log_date}", response_model=LogOut)
def save_log(
    log_date: dt.date,
    payload: LogIn,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    if log_date > today:
        raise HTTPException(status_code=400, detail="You can't log a future date")

    row = db.scalar(
        select(DailyLog).where(DailyLog.user_id == user_id, DailyLog.log_date == log_date)
    )
    is_empty = not (
        payload.flow or payload.mood or payload.symptoms
        or payload.bbt is not None or payload.cervical_mucus
    )
    if is_empty:  # saving an empty form clears the day
        if row:
            db.delete(row)
            db.commit()
        return LogOut(log_date=log_date)

    if row is None:
        row = DailyLog(user_id=user_id, log_date=log_date)
        db.add(row)
    row.flow = payload.flow
    row.mood = payload.mood
    row.symptoms = list(payload.symptoms)
    row.bbt = payload.bbt
    row.cervical_mucus = payload.cervical_mucus
    db.commit()
    db.refresh(row)
    return row