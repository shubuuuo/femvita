from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import expression

from .database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="users_email_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # Public handle shown on community posts. Nullable so existing rows don't break the migration.
    username: Mapped[str | None] = mapped_column(String(30), unique=True)
    # Sign-in details. Nullable because the demo user has none until someone registers and claims it.
    email: Mapped[str | None] = mapped_column(String(254))   # always stored lowercase
    password_hash: Mapped[str | None] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(80))
    birthday: Mapped[date | None] = mapped_column(Date)
    # Moderators. Set by hand in the database (the demo user is made admin in main.py).
    # server_default matters: existing rows need a value when the column is added.
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default=expression.false())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuthSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # Only the SHA-256 of the cookie value is stored, so a leaked database can't be used to sign in
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

class ChallengeCheckin(Base):
    __tablename__ = "challenge_checkins"
    __table_args__ = (UniqueConstraint("user_id", "challenge_slug", "day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    challenge_slug: Mapped[str] = mapped_column(String(50))
    day: Mapped[date] = mapped_column(Date)

class DailyLog(Base):
    __tablename__ = "daily_logs"
    __table_args__ = (UniqueConstraint("user_id", "log_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    log_date: Mapped[date] = mapped_column(Date)
    flow: Mapped[str | None] = mapped_column(String(10))
    mood: Mapped[str | None] = mapped_column(String(10))
    symptoms: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    bbt: Mapped[float | None] = mapped_column(Numeric(4, 2, asdecimal=False))
    cervical_mucus: Mapped[str | None] = mapped_column(String(20))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    # The real author is always stored (moderation needs it). "anonymous" only hides it from other members.
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)
    tag: Mapped[str] = mapped_column(String(30), index=True)
    # NULL = a normal post on the main feed. A group's posts show ONLY in that group's feed.
    group_id: Mapped[int | None] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE", name="posts_group_id_fkey"), index=True
    )
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)  # for moderation later
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Reply(Base):
    __tablename__ = "replies"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Deleting a post deletes its replies (done by Postgres through ON DELETE CASCADE)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    # Like posts: the real author is always stored, "anonymous" only hides it from other members.
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(Text)
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)  # for moderation later
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# One row = "this user supports this post". The pair is the primary key, so a double-click can't
# create a duplicate, and post_id comes first so "count the supports on a post" uses the key's index.
class PostSupport(Base):
    __tablename__ = "post_supports"

    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# Private to the user. user_id comes first so "everything this user saved" uses the key's index.
class Bookmark(Base):
    __tablename__ = "bookmarks"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------------- Reports (moderation) ----------------
class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        # One report per person per item. NULLs never clash in Postgres, so a post report
        # (reply_id NULL) and a reply report (post_id NULL) each get their own uniqueness.
        UniqueConstraint("reporter_id", "post_id", name="reports_reporter_post_key"),
        UniqueConstraint("reporter_id", "reply_id", name="reports_reporter_reply_key"),
        CheckConstraint("(post_id IS NULL) <> (reply_id IS NULL)", name="reports_one_target"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    post_id: Mapped[int | None] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    reply_id: Mapped[int | None] = mapped_column(ForeignKey("replies.id", ondelete="CASCADE"), index=True)
    reason: Mapped[str] = mapped_column(String(30))
    note: Mapped[str | None] = mapped_column(String(300))
    # pending -> actioned (admin hid it) or dismissed (admin kept/restored it)
    status: Mapped[str] = mapped_column(String(10), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------------- Daily poll ----------------
class Poll(Base):
    __tablename__ = "polls"

    id: Mapped[int] = mapped_column(primary_key=True)
    question: Mapped[str] = mapped_column(String(200))
    active_on: Mapped[date] = mapped_column(Date, unique=True)  # the one day this poll is shown


class PollOption(Base):
    __tablename__ = "poll_options"

    id: Mapped[int] = mapped_column(primary_key=True)
    poll_id: Mapped[int] = mapped_column(ForeignKey("polls.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(80))


class PollVote(Base):
    __tablename__ = "poll_votes"

    # (poll, user) is the key: one vote per person per poll, enforced by the database
    poll_id: Mapped[int] = mapped_column(ForeignKey("polls.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    option_id: Mapped[int] = mapped_column(ForeignKey("poll_options.id", ondelete="CASCADE"))


# ---------------- Support groups ----------------
class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(String(200))


class GroupMember(Base):
    __tablename__ = "group_members"

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------------- Daily metrics (sleep, steps, water) ----------------
class DailyMetric(Base):
    __tablename__ = "daily_metrics"
    __table_args__ = (
        UniqueConstraint("user_id", "day", name="daily_metrics_user_day_key"),
        CheckConstraint("sleep_minutes BETWEEN 0 AND 1440", name="daily_metrics_sleep_range"),
        CheckConstraint("steps BETWEEN 0 AND 200000", name="daily_metrics_steps_range"),
        CheckConstraint("hydration_ml BETWEEN 0 AND 10000", name="daily_metrics_hydration_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date)
    # Sleep on day D = the night that ended on the morning of D. NULL = not entered.
    sleep_minutes: Mapped[int | None]
    steps: Mapped[int | None]
    # Water is a running total for the day, so 0 is a real value (no NULL needed)
    hydration_ml: Mapped[int] = mapped_column(default=0, server_default="0")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # No row = all defaults, so existing users need no backfill
    cycle_alerts: Mapped[bool] = mapped_column(Boolean, default=True, server_default=expression.true())
    log_reminder: Mapped[bool] = mapped_column(Boolean, default=True, server_default=expression.true())