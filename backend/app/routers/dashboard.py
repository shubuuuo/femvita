import datetime as dt

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import cycle_logic as logic
from ..database import get_db
from ..deps import get_current_user_id, get_today
from ..models import Post, PostSupport, User
from ..schemas import HealthTopic, PostOut, TipOut
from ..services import medlineplus
from .community import decorate
from .cycle import load_model

router = APIRouter(prefix="/api/dashboard")

LABELS = {
    "menstrual": "Menstrual phase",
    "follicular": "Follicular phase",
    "ovulatory": "Ovulatory phase",
    "luteal": "Luteal phase",
}

# General, soft-worded tips. Not medical advice, so nothing here promises an outcome.
TIPS = {
    "menstrual": [
        "Many people find a warm compress or gentle stretching helps with cramps.",
        "Iron-rich foods such as lentils, beans and leafy greens fit well around your period.",
        "Energy is often lower early in a period. A lighter day or an earlier night is fine.",
    ],
    "follicular": [
        "Energy often picks up in this phase, so it can be a good time to try a new workout.",
        "Fresh vegetables, whole grains and a source of protein make an easy base for the week.",
        "A good moment to plan the things you want to get done over the next few weeks.",
    ],
    "ovulatory": [
        "Many people feel more social and energetic around ovulation. Plan something you enjoy.",
        "If you're training harder, drink a little extra water.",
        "Logging your BBT each morning helps you see your own pattern over time.",
    ],
    "luteal": [
        "Some people notice lower energy or mood shifts before their period. Gentle movement and an earlier bedtime can help.",
        "Foods with magnesium, like leafy greens, nuts, seeds and dark chocolate, are a nice addition. The evidence for PMS relief is mixed.",
        "Noting symptoms in your log makes patterns easier to spot. If they disrupt your daily life, talk to a doctor.",
    ],
}

GENERAL = [
    "Log your period when it starts. Your estimates get more accurate with every cycle you record.",
    "A glass of water and a short walk is a small reset on a busy day.",
    "Consistent sleep and wake times are one of the simplest habits to build.",
]


@router.get("/tip", response_model=TipOut)
def phase_tip(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    today: dt.date = Depends(get_today),
):
    s = logic.summarize(load_model(db, user_id), today)
    phase = s["phase"] if s["days_late"] == 0 else None  # late: the phase is unknown, so don't claim one
    pool = TIPS[phase] if phase else GENERAL
    return TipOut(
        phase=phase,
        label=LABELS.get(phase, "Everyday"),
        text=pool[today.toordinal() % len(pool)],  # same tip all day, new one tomorrow
    )

# ---------------- Community highlight ----------------
@router.get("/community-highlight", response_model=PostOut | None)
def community_highlight(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """The most supported thread from the last 7 days. Group posts are private to their group, so they
    never appear here, and hidden posts are skipped. null = nothing to show yet."""
    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)
    supports = func.count(PostSupport.user_id)
    row = db.execute(
        select(Post, User.username)
        .join(User, User.id == Post.author_id)
        .outerjoin(PostSupport, PostSupport.post_id == Post.id)
        .where(Post.is_hidden.is_(False), Post.group_id.is_(None), Post.created_at >= since)
        .group_by(Post.id, User.username)
        .order_by(supports.desc(), Post.id.desc())  # ties go to the newer post
        .limit(1)
    ).first()
    if row is None:
        return None
    return decorate(db, [(row[0], row[1])], user_id)[0]  # reuses the community card logic, so anonymous stays anonymous


# ---------------- Featured article ----------------
# One MedlinePlus topic per day, picked by date so it stays the same all day.
ARTICLE_TERMS = [
    "Menstruation", "Sleep", "Stress", "Polycystic Ovary Syndrome", "Endometriosis",
    "Nutrition", "Exercise and Physical Fitness", "Anxiety", "Menopause", "Pregnancy",
]


@router.get("/article", response_model=HealthTopic | None)
def featured_article(today: dt.date = Depends(get_today)):
    term = ARTICLE_TERMS[today.toordinal() % len(ARTICLE_TERMS)]
    topics = medlineplus.search_topics(term, limit=1)  # cached 12 h, so this is cheap
    return topics[0] if topics else None