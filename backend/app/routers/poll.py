import datetime as dt

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user_id, get_today
from ..models import Poll, PollOption, PollVote
from ..schemas import PollOptionOut, PollOut, VoteIn

router = APIRouter(prefix="/api/community/poll")


def todays_poll(db: Session, today: dt.date) -> Poll | None:
    return db.scalar(select(Poll).where(Poll.active_on == today))


def build(db: Session, poll: Poll, user_id: int) -> PollOut:
    options = db.scalars(select(PollOption).where(PollOption.poll_id == poll.id).order_by(PollOption.id)).all()
    my_vote = db.scalar(select(PollVote.option_id).where(PollVote.poll_id == poll.id, PollVote.user_id == user_id))

    if my_vote is None:  # results stay hidden until you've voted, so the numbers don't sway you
        return PollOut(
            id=poll.id,
            question=poll.question,
            options=[PollOptionOut(id=o.id, label=o.label) for o in options],
            my_vote=None,
            total=None,
        )

    counts = dict(
        db.execute(
            select(PollVote.option_id, func.count()).where(PollVote.poll_id == poll.id).group_by(PollVote.option_id)
        ).all()
    )
    total = sum(counts.values())
    return PollOut(
        id=poll.id,
        question=poll.question,
        options=[
            PollOptionOut(
                id=o.id,
                label=o.label,
                votes=counts.get(o.id, 0),
                percent=round(100 * counts.get(o.id, 0) / total) if total else 0,
            )
            for o in options
        ],
        my_vote=my_vote,
        total=total,
    )


@router.get("/today", response_model=PollOut | None)
def get_poll(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    poll = todays_poll(db, today)
    return build(db, poll, user_id) if poll else None  # null = no poll today, the page hides the widget


@router.put("/vote", response_model=PollOut)
def vote(
    payload: VoteIn,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    poll = todays_poll(db, today)
    if poll is None:
        raise HTTPException(status_code=404, detail="There's no poll today.")
    option = db.get(PollOption, payload.option_id)
    if option is None or option.poll_id != poll.id:
        raise HTTPException(status_code=400, detail="That option isn't part of today's poll.")

    existing = db.scalar(select(PollVote.option_id).where(PollVote.poll_id == poll.id, PollVote.user_id == user_id))
    if existing is not None and existing != option.id:
        # Votes are final, otherwise people could peek at the results and then change their answer
        raise HTTPException(status_code=409, detail="You've already voted in today's poll.")
    if existing is None:
        try:
            db.add(PollVote(poll_id=poll.id, user_id=user_id, option_id=option.id))
            db.commit()
        except IntegrityError:  # double-click race: the vote is already saved
            db.rollback()
    return build(db, poll, user_id)