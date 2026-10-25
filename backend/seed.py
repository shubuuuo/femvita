"""Run from backend/:  python seed.py   (safe to re-run; replaces the demo user's logs)"""
import random
from datetime import date, timedelta

from sqlalchemy import delete

from app.database import Base, SessionLocal, engine
from app.deps import DEMO_USER_ID
from app.models import DailyLog, User

random.seed(1)
Base.metadata.create_all(engine)

today = date.today()
FLOW = ["heavy", "heavy", "medium", "light", "light"]

# Latest period started 13 days ago, so today is cycle day 14.
starts = [today - timedelta(days=13)]
for length in [30, 28, 29, 28]:  # completed cycles, newest first
    starts.insert(0, starts[0] - timedelta(days=length))

rows = []
for i, start in enumerate(starts):
    length = (starts[i + 1] - start).days if i + 1 < len(starts) else 28
    for offset in range(length):
        d = start + timedelta(days=offset)
        if d > today:
            break
        after_ovulation = offset >= length - 14
        rows.append(
            DailyLog(
                user_id=DEMO_USER_ID,
                log_date=d,
                flow=FLOW[offset] if offset < len(FLOW) else None,
                mood=random.choice(["happy", "happy", "neutral", "sad"]),
                symptoms=["cramps", "fatigue"] if offset < 2 else (["acne"] if random.random() < 0.1 else []),
                bbt=round(random.gauss(36.7 if after_ovulation else 36.35, 0.08), 2),
            )
        )

with SessionLocal() as db:
    if db.get(User, DEMO_USER_ID) is None:
        db.add(User(id=DEMO_USER_ID))
        db.flush()
    db.execute(delete(DailyLog).where(DailyLog.user_id == DEMO_USER_ID))
    db.add_all(rows)
    db.commit()
print(f"Seeded {len(rows)} days")