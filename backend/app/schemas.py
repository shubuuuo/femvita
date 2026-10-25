import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Flow = Literal["light", "medium", "heavy"]
Mood = Literal["happy", "neutral", "sad"]
Mucus = Literal["dry", "sticky", "creamy", "watery", "egg_white"]
Symptom = Literal["cramps", "fatigue", "acne", "headache", "mood_shifts"]
Phase = Literal["menstrual", "follicular", "ovulatory", "luteal"]



class LogIn(BaseModel):
    flow: Flow | None = None
    mood: Mood | None = None
    symptoms: list[Symptom] = []
    bbt: float | None = Field(default=None, ge=34, le=42)  # °C
    cervical_mucus: Mucus | None = None


class LogOut(LogIn):
    model_config = ConfigDict(from_attributes=True)
    log_date: dt.date


class DayInfo(BaseModel):
    date: dt.date
    cycle_day: int | None
    is_period: bool            # flow was logged on this day
    is_predicted_period: bool
    is_fertile: bool
    is_ovulation: bool
    log: LogOut | None


class Summary(BaseModel):
    today: dt.date
    has_data: bool
    avg_cycle_length: int
    avg_period_length: int
    cycles_used: int           # how many logged cycles the averages are based on
    cycle_day: int | None
    days_late: int
    next_period_in: int | None
    ovulation_day: int | None
    fertile_start: int | None
    fertile_end: int | None
    last_period_start: dt.date | None
    phase: Phase | None = None


class BbtPoint(BaseModel):
    date: dt.date
    bbt: float
    cycle_day: int | None

class CheckinIn(BaseModel):
    done: bool


class ChallengeDay(BaseModel):
    date: dt.date
    done: bool
    is_today: bool
    is_future: bool


class ChallengeOut(BaseModel):
    slug: str
    title: str
    description: str
    week_start: dt.date
    completed: int
    target: int
    days: list[ChallengeDay]  # always Monday to Sunday, in order


class HealthTopic(BaseModel):
    title: str
    summary: str
    url: str
    snippet: str | None = None


class HealthTopicsOut(BaseModel):
    term: str
    topics: list[HealthTopic]


class MealCard(BaseModel):
    id: str
    name: str
    thumb: str | None = None


class NutritionOut(BaseModel):
    phase: Phase
    label: str
    why: str
    detected: bool          # True if the phase was worked out from the user's own period logs
    meals: list[MealCard]


class Ingredient(BaseModel):
    name: str
    measure: str


class MealDetail(BaseModel):
    id: str
    name: str
    category: str | None = None
    area: str | None = None
    thumb: str | None = None
    ingredients: list[Ingredient]
    steps: list[str]
    source_url: str | None = None
    youtube_url: str | None = None


class Move(BaseModel):
    id: int
    name: str
    description: str
    muscles: list[str]
    muscles_secondary: list[str]
    equipment: list[str]
    image: str | None = None
    credit: str | None = None


# ---- Community ----
Tag = Literal[
    "general",
    "cycle-syncing",
    "pcos-endometriosis",
    "pregnancy-fertility",
    "mental-wellness",
    "nutrition-fitness",
]


class MeOut(BaseModel):
    id: int
    username: str | None
    is_admin: bool = False


class PostIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=3, max_length=120)
    body: str = Field(min_length=1, max_length=5000)
    tag: Tag
    anonymous: bool = False
    group: str | None = Field(default=None, max_length=50)  # a group's slug; None = main feed


class PostOut(BaseModel):
    id: int
    title: str
    body: str
    tag: Tag
    anonymous: bool
    author: str            # "Anonymous Member" for anonymous posts: the real username is never sent
    is_mine: bool          # lets the author see a delete button, even on an anonymous post
    created_at: dt.datetime
    support_count: int = 0
    reply_count: int = 0
    supported_by_me: bool = False
    bookmarked_by_me: bool = False
    group: str | None = None       # slug
    group_name: str | None = None


class PostList(BaseModel):
    posts: list[PostOut]
    next_before: int | None  # pass as ?before= to get the next page; None = no more posts


class Deleted(BaseModel):
    ok: bool = True


class ToggleIn(BaseModel):
    on: bool               # PUT {on: true} = add, {on: false} = remove. Sending it twice is harmless.


class ReplyIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    body: str = Field(min_length=1, max_length=2000)
    anonymous: bool = False


class ReplyOut(BaseModel):
    id: int
    post_id: int
    body: str
    author: str            # username, "Anonymous 1", "Anonymous 2"... or "Anonymous Member" (see community.py)
    is_op: bool            # written by the person who started the thread
    is_mine: bool
    created_at: dt.datetime


class ReplyList(BaseModel):
    replies: list[ReplyOut]


class Ok(BaseModel):
    ok: bool = True


# ---- Reports and moderation ----
Reason = Literal["harassment", "medical_misinformation", "self_harm_concern", "spam", "other"]


class ReportIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    reason: Reason
    note: str | None = Field(default=None, max_length=300)


class AdminItem(BaseModel):
    kind: Literal["post", "reply"]
    id: int
    post_id: int                 # for a reply, the post it belongs to
    title: str | None            # posts only
    body: str
    author: str                  # the REAL username: moderators can see who wrote anonymous items
    anonymous: bool
    is_hidden: bool
    report_count: int
    reasons: dict[str, int]
    notes: list[str]
    self_harm: bool
    created_at: dt.datetime


class AdminQueue(BaseModel):
    items: list[AdminItem]


class ResolveIn(BaseModel):
    action: Literal["hide", "restore"]


# ---- Daily poll ----
class PollOptionOut(BaseModel):
    id: int
    label: str
    votes: int | None = None      # results stay hidden (None) until you've voted
    percent: int | None = None


class PollOut(BaseModel):
    id: int
    question: str
    options: list[PollOptionOut]
    my_vote: int | None
    total: int | None


class VoteIn(BaseModel):
    option_id: int


# ---- Groups ----
class GroupOut(BaseModel):
    slug: str
    name: str
    description: str
    member_count: int
    joined: bool

# ---- Dashboard ----
class TipOut(BaseModel):
    phase: Phase | None    # None = no usable phase (no data yet, or period is late), so a general tip is shown
    label: str
    text: str

# ---- Daily metrics ----
class MetricDay(BaseModel):
    date: dt.date
    sleep_minutes: int | None
    steps: int | None
    hydration_ml: int


class Goals(BaseModel):
    sleep_minutes: int
    steps: int
    hydration_ml: int


class MetricsWeek(BaseModel):
    goals: Goals
    days: list[MetricDay]   # 7 days, oldest first, the last one is today


class WaterIn(BaseModel):
    ml: int = Field(ge=-2000, le=2000)   # negative = undo a tap


class MetricsIn(BaseModel):
    sleep_minutes: int | None = Field(default=None, ge=0, le=1440)
    steps: int | None = Field(default=None, ge=0, le=200000)

# ---- Notifications (computed, nothing stored) ----
class NotificationOut(BaseModel):
    kind: Literal["period", "fertile", "ovulation", "log"]   # one of each at most, so it's also the React key
    text: str
    href: str


class NotificationList(BaseModel):
    items: list[NotificationOut]