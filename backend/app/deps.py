from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import AuthSession, User
from .security import COOKIE_NAME, hash_token


def get_session_user(request: Request, db: Session = Depends(get_db)) -> User:
    """The signed-in user, read from the session cookie. 401 if there's no valid session."""
    token = request.cookies.get(COOKIE_NAME)
    row = None
    if token:
        row = db.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == hash_token(token),
                AuthSession.expires_at > datetime.now(timezone.utc),
            )
        )
    user = db.get(User, row.user_id) if row else None
    if user is None:
        raise HTTPException(status_code=401, detail="Please sign in.")
    return user


def get_current_user_id(user: User = Depends(get_session_user)) -> int:
    """Every endpoint that says Depends(get_current_user_id) now needs a signed-in user."""
    return user.id


def require_admin(user: User = Depends(get_session_user)) -> int:
    """Guards the moderation endpoints. 403 for everyone who isn't flagged is_admin in the database."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Moderators only.")
    return user.id


def get_today(tz: str = Query("UTC")) -> date:
    """Today's date in the user's timezone (the frontend sends it as ?tz=)."""
    try:
        zone = ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        zone = ZoneInfo("UTC")
    return datetime.now(zone).date()