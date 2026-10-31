import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_session_user
from ..models import AuthSession, User
from ..schemas import AccountOut, LoginIn, Ok, RegisterIn
from ..security import (
    COOKIE_NAME, DUMMY_HASH, hash_password, hash_token, needs_rehash, new_token, verify_password,
)
from ..throttle import client_ip, login_by_email, login_by_ip, register_by_ip, too_many

router = APIRouter(prefix="/api/auth")


def start_session(db: Session, response: Response, user_id: int) -> None:
    """Create a session row and set the cookie. Commits."""
    now = dt.datetime.now(dt.timezone.utc)
    db.execute(delete(AuthSession).where(AuthSession.expires_at < now))  # tidy up expired sessions
    token = new_token()
    db.add(
        AuthSession(
            user_id=user_id,
            token_hash=hash_token(token),
            expires_at=now + dt.timedelta(days=settings.session_days),
        )
    )
    db.commit()
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=settings.session_days * 86400,
        httponly=True,                 # JavaScript can't read it, so injected scripts can't steal it
        samesite="lax",                # not sent on cross-site POSTs
        secure=settings.cookie_secure,
        path="/",
    )


@router.post("/register", response_model=AccountOut, status_code=201)
def register(payload: RegisterIn, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request)
    wait = register_by_ip.blocked(ip)
    if wait:
        raise too_many(wait)
    register_by_ip.hit(ip)  # every attempt counts, successful or not

    email = payload.email.strip().lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail="That email is already registered.")
    if db.scalar(select(User.id).where(func.lower(User.username) == payload.username.lower())) is not None:
        raise HTTPException(status_code=409, detail="That username is taken.")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        username=payload.username,
        full_name=payload.full_name,
        birthday=payload.birthday,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError:  # someone registered the same email or username a moment ago
        db.rollback()
        raise HTTPException(status_code=409, detail="That email or username is already registered.")

    start_session(db, response, user.id)  # signs you in straight away
    db.refresh(user)
    return user


@router.post("/login", response_model=AccountOut)
def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    ip = client_ip(request)
    wait = max(login_by_email.blocked(email), login_by_ip.blocked(ip))
    if wait:  # even the right password is refused while locked, otherwise guessing could carry on
        raise too_many(wait)

    user = db.scalar(select(User).where(User.email == email))
    if user is None or user.password_hash is None:
        verify_password(DUMMY_HASH, payload.password)  # same time spent, so speed doesn't reveal whether the email exists
        ok = False
    else:
        ok = verify_password(user.password_hash, payload.password)

    if not ok:
        login_by_email.hit(email)  # counted for unknown emails too, so lockouts don't reveal which exist
        login_by_ip.hit(ip)
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    login_by_email.reset(email)
    if needs_rehash(user.password_hash):  # hashing settings were strengthened since this password was saved
        user.password_hash = hash_password(payload.password)
    start_session(db, response, user.id)
    db.refresh(user)
    return user


@router.post("/logout", response_model=Ok)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == hash_token(token)))
        db.commit()
    response.delete_cookie(COOKIE_NAME, path="/")
    return Ok()  # fine to call when already signed out


@router.get("/me", response_model=AccountOut)
def me(user: User = Depends(get_session_user)):
    return user