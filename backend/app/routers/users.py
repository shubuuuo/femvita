from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user_id
from ..models import User
from ..schemas import MeOut

router = APIRouter(prefix="/api")


@router.get("/me", response_model=MeOut)
def me(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return MeOut(id=user.id, username=user.username, is_admin=user.is_admin)

    """Run once from backend/:  python seed_community.py
Adds the three support groups and 10 daily polls (one per day, starting yesterday so every timezone
has a poll today). Safe to run again: it skips anything that already exists, and running it later
adds a fresh batch of days after the last poll."""
import datetime as dt

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import Group, Poll, PollOption

GROUPS = [
    ("endo-warriors", "Endo Warriors", "Support and shared experiences for people living with endometriosis."),
    ("first-time-cycle-trackers", "First-Time Cycle Trackers", "New to tracking? Ask anything, no question is too basic."),
    ("postpartum-recovery", "Postpartum & Recovery", "Talk about life after birth: recovery, sleep, and everything in between."),
]

POLLS = [
    ("How do you usually manage pre-menstrual fatigue?",
     ["Extra sleep / rest", "Light movement & yoga", "Hydration & electrolytes", "Dietary changes"]),
    ("What's your favourite way to unwind after a stressful day?",
     ["Yoga or stretching", "Reading", "Chatting with a friend", "A walk outside"]),
    ("How much sleep do you usually get?",
     ["Under 6 hours", "6 to 7 hours", "7 to 8 hours", "More than 8 hours"]),
    ("How often do you log in your cycle tracker?",
     ["Every day", "Most days", "Only when something feels off", "I'm just getting started"]),
    ("When do you feel most energetic?",
     ["Right after my period", "Around ovulation", "Before my period", "It varies"]),
    ("What helps most when you have cramps?",
     ["Heat (heating pad or warm bath)", "Gentle movement", "Rest", "Something else"]),
    ("How much water do you drink on a typical day?",
     ["Under 1 litre", "1 to 2 litres", "2 to 3 litres", "More than 3 litres"]),
    ("What would you like to see more of in FemVita?",
     ["Recipes", "Workouts", "Guided meditations", "Expert Q&As"]),
    ("How do you prefer to learn about your health?",
     ["Short articles", "Videos", "Talking to an expert", "Community stories"]),
    ("What's your go-to morning ritual?",
     ["Stretching", "Journaling", "A big glass of water", "Coffee or tea first"]),
]

with SessionLocal() as db:
    for slug, name, description in GROUPS:
        if not db.scalar(select(Group).where(Group.slug == slug)):
            db.add(Group(slug=slug, name=name, description=description))

    last = db.scalar(select(func.max(Poll.active_on)))
    day = (last + dt.timedelta(days=1)) if last else dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=1)
    existing = set(db.scalars(select(Poll.question)).all())
    added = 0
    for question, labels in POLLS:
        if question in existing:
            continue
        poll = Poll(question=question, active_on=day)
        db.add(poll)
        db.flush()  # gives the poll its id
        db.add_all(PollOption(poll_id=poll.id, label=label) for label in labels)
        day += dt.timedelta(days=1)
        added += 1
    db.commit()
    print(f"Groups ready. Added {added} polls.")