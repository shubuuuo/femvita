from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

DEMO_USER_ID = 1
DEMO_USERNAME = "s.j"


def get_current_user_id() -> int:
    """Placeholder until you add real login. Swap this for a function that reads the auth token."""
    return DEMO_USER_ID


def require_admin(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)) -> int:
    """Guards the moderation endpoints. 403 for everyone who isn't flagged is_admin in the database."""
    user = db.get(User, user_id)
    if user is None or not user.is_admin:
        raise HTTPException(status_code=403, detail="Moderators only.")
    return user_id


def get_today(tz: str = Query("UTC")) -> date:
    """Today's date in the user's timezone (the frontend sends it as ?tz=)."""
    try:
        zone = ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        zone = ZoneInfo("UTC")
    return datetime.now(zone).date()