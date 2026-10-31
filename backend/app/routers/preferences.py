from fastapi import APIRouter, Depends
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user_id
from ..models import UserSettings
from ..schemas import PreferencesIn, PreferencesOut

router = APIRouter(prefix="/api/preferences")


def load_preferences(db: Session, user_id: int) -> PreferencesOut:
    row = db.get(UserSettings, user_id)
    if row is None:  # never changed anything: everything is on
        return PreferencesOut(cycle_alerts=True, log_reminder=True)
    return PreferencesOut(cycle_alerts=row.cycle_alerts, log_reminder=row.log_reminder)


@router.get("", response_model=PreferencesOut)
def get_preferences(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return load_preferences(db, user_id)


@router.patch("", response_model=PreferencesOut)
def update_preferences(
    payload: PreferencesIn,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    changes = payload.model_dump(exclude_none=True)
    if changes:
        stmt = pg_insert(UserSettings).values(user_id=user_id, **changes)
        db.execute(stmt.on_conflict_do_update(index_elements=["user_id"], set_=changes))
        db.commit()
    return load_preferences(db, user_id)