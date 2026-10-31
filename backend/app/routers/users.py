import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user_id
from ..models import (
    AuthSession, Bookmark, ChallengeCheckin, DailyLog, DailyMetric, Group, GroupMember,
    Poll, PollOption, PollVote, Post, PostSupport, Reply, Report, User,
)
from ..schemas import AccountOut, DeleteAccountIn, Ok, PasswordChangeIn, ProfileIn
from ..security import COOKIE_NAME, hash_password, hash_token, verify_password
from .preferences import load_preferences
from ..throttle import password_checks, too_many

router = APIRouter(prefix="/api")


def get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/me", response_model=AccountOut)
def me(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return get_user(db, user_id)


@router.patch("/me", response_model=AccountOut)
def update_me(
    payload: ProfileIn,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = get_user(db, user_id)

    if payload.username is not None and payload.username != user.username:
        taken = db.scalar(
            select(User.id).where(func.lower(User.username) == payload.username.lower(), User.id != user.id)
        )
        if taken is not None:
            raise HTTPException(status_code=409, detail="That username is taken.")
        user.username = payload.username
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.birthday is not None:
        user.birthday = payload.birthday

    try:
        db.commit()
    except IntegrityError:  # someone took the username a moment ago
        db.rollback()
        raise HTTPException(status_code=409, detail="That username is taken.")
    db.refresh(user)
    return user


@router.post("/me/password", response_model=Ok)
def change_password(
    payload: PasswordChangeIn,
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = get_user(db, user_id)
    if user.password_hash is None:
        raise HTTPException(status_code=400, detail="This account has no password yet. Register first.")
    wait = password_checks.blocked(str(user.id))
    if wait:
        raise too_many(wait)
    if not verify_password(user.password_hash, payload.current_password):
        password_checks.hit(str(user.id))
        raise HTTPException(status_code=400, detail="Your current password is incorrect.")
    password_checks.reset(str(user.id))
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=400, detail="The new password must be different from the current one.")

    user.password_hash = hash_password(payload.new_password)

    # Sign out every other device: delete all this user's sessions except the one making this request.
    # (With no cookie at all, such as in /docs before step 1c, that means all of them.)
    stmt = delete(AuthSession).where(AuthSession.user_id == user.id)
    token = request.cookies.get(COOKIE_NAME)
    if token:
        stmt = stmt.where(AuthSession.token_hash != hash_token(token))
    db.execute(stmt)
    db.commit()
    return Ok()

# ---------------- Export ----------------
def pick(obj, *fields):
    return {f: getattr(obj, f) for f in fields}


@router.get("/me/export")
def export_my_data(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Everything FemVita holds about you. Left out on purpose: your password hash, your sign-in sessions,
    and other people's posts and replies (bookmarks and supports list only the post ids)."""
    user = get_user(db, user_id)

    def mine(model, column, order):
        return db.scalars(select(model).where(column == user_id).order_by(order)).all()

    votes = db.execute(
        select(Poll.question, Poll.active_on, PollOption.label)
        .select_from(PollVote)
        .join(Poll, Poll.id == PollVote.poll_id)
        .join(PollOption, PollOption.id == PollVote.option_id)
        .where(PollVote.user_id == user_id)
    ).all()
    groups = db.execute(
        select(Group.slug, Group.name, GroupMember.created_at)
        .select_from(GroupMember)
        .join(Group, Group.id == GroupMember.group_id)
        .where(GroupMember.user_id == user_id)
    ).all()

    return {
        "exported_at": dt.datetime.now(dt.timezone.utc),
        "account": pick(user, "email", "username", "full_name", "birthday", "created_at"),
        "preferences": load_preferences(db, user_id).model_dump(),
        "daily_logs": [
            pick(r, "log_date", "flow", "mood", "symptoms", "bbt", "cervical_mucus")
            for r in mine(DailyLog, DailyLog.user_id, DailyLog.log_date)
        ],
        "daily_metrics": [
            pick(r, "day", "sleep_minutes", "steps", "hydration_ml")
            for r in mine(DailyMetric, DailyMetric.user_id, DailyMetric.day)
        ],
        "challenge_checkins": [
            pick(r, "challenge_slug", "day") for r in mine(ChallengeCheckin, ChallengeCheckin.user_id, ChallengeCheckin.day)
        ],
        "posts": [
            pick(r, "id", "title", "body", "tag", "anonymous", "group_id", "is_hidden", "created_at")
            for r in mine(Post, Post.author_id, Post.id)
        ],
        "replies": [
            pick(r, "id", "post_id", "body", "anonymous", "is_hidden", "created_at")
            for r in mine(Reply, Reply.author_id, Reply.id)
        ],
        "supported_post_ids": [r.post_id for r in mine(PostSupport, PostSupport.user_id, PostSupport.post_id)],
        "bookmarked_post_ids": [r.post_id for r in mine(Bookmark, Bookmark.user_id, Bookmark.post_id)],
        "poll_votes": [dict(r._mapping) for r in votes],
        "groups": [dict(r._mapping) for r in groups],
        "reports_made": [
            pick(r, "post_id", "reply_id", "reason", "note", "status", "created_at")
            for r in mine(Report, Report.reporter_id, Report.id)
        ],
    }


# ---------------- Delete account ----------------
@router.post("/me/delete", response_model=Ok)
def delete_account(
    payload: DeleteAccountIn,
    response: Response,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    user = get_user(db, user_id)
    if user.password_hash is None:
        raise HTTPException(status_code=400, detail="This account has no password yet. Register first.")
    wait = password_checks.blocked(str(user.id))
    if wait:
        raise too_many(wait)
    if not verify_password(user.password_hash, payload.password):
        password_checks.hit(str(user.id))
        raise HTTPException(status_code=400, detail="Your password is incorrect.")
    password_checks.reset(str(user.id))
    if user.is_admin:
        other_admins = db.scalar(
            select(func.count()).select_from(User).where(User.is_admin.is_(True), User.id != user.id)
        )
        if not other_admins:
            raise HTTPException(status_code=400, detail="You're the only moderator. Make another account a moderator first.")

    db.delete(user)  # Postgres removes everything that points at this user (ON DELETE CASCADE)
    db.commit()
    response.delete_cookie(COOKIE_NAME, path="/")
    return Ok()