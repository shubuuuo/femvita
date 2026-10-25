from collections import Counter, defaultdict
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Post, Reply, Report, User
from ..schemas import AdminItem, AdminQueue, Ok, ResolveIn

# Every route in this file needs a moderator: the dependency runs before any of them.
router = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])

SELF_HARM = "self_harm_concern"
Kind = Literal["post", "reply"]


def _item(kind: Kind, obj: Post | Reply, username: str | None, reports: list[Report]) -> AdminItem:
    reasons = Counter(r.reason for r in reports)
    return AdminItem(
        kind=kind,
        id=obj.id,
        post_id=obj.id if isinstance(obj, Post) else obj.post_id,
        title=obj.title if isinstance(obj, Post) else None,
        body=obj.body[:1500],
        author=username or "Member",  # real name, even for anonymous items: moderators need it
        anonymous=obj.anonymous,
        is_hidden=obj.is_hidden,
        report_count=len(reports),
        reasons=dict(reasons),
        notes=[r.note for r in reports if r.note],
        self_harm=SELF_HARM in reasons,
        created_at=obj.created_at,
    )


def _load(db: Session, post_ids: set[int], reply_ids: set[int]):
    posts = db.execute(
        select(Post, User.username).join(User, User.id == Post.author_id).where(Post.id.in_(post_ids))
    ).all()
    replies = db.execute(
        select(Reply, User.username).join(User, User.id == Reply.author_id).where(Reply.id.in_(reply_ids))
    ).all()
    return posts, replies


@router.get("/reports", response_model=AdminQueue)
def reports(view: Literal["pending", "hidden"] = Query("pending"), db: Session = Depends(get_db)):
    """pending = items with unresolved reports (most urgent first). hidden = everything currently hidden."""
    by_post: dict[int, list[Report]] = defaultdict(list)
    by_reply: dict[int, list[Report]] = defaultdict(list)

    if view == "pending":
        rows = db.scalars(
            select(Report).where(Report.status == "pending").order_by(Report.id.desc()).limit(500)
        ).all()
        for r in rows:
            (by_post if r.post_id else by_reply)[r.post_id or r.reply_id].append(r)
        post_ids, reply_ids = set(by_post), set(by_reply)
    else:
        post_ids = set(db.scalars(select(Post.id).where(Post.is_hidden.is_(True)).order_by(Post.id.desc()).limit(100)).all())
        reply_ids = set(db.scalars(select(Reply.id).where(Reply.is_hidden.is_(True)).order_by(Reply.id.desc()).limit(100)).all())
        for r in db.scalars(
            select(Report).where(or_(Report.post_id.in_(post_ids), Report.reply_id.in_(reply_ids)))
        ).all():
            (by_post if r.post_id else by_reply)[r.post_id or r.reply_id].append(r)

    posts, replies = _load(db, post_ids, reply_ids)
    items = [_item("post", p, name, by_post.get(p.id, [])) for p, name in posts]
    items += [_item("reply", r, name, by_reply.get(r.id, [])) for r, name in replies]

    if view == "pending":
        # self-harm concerns first, then the most-reported, then the oldest
        items.sort(key=lambda i: (not i.self_harm, -i.report_count, i.created_at))
    else:
        items.sort(key=lambda i: i.created_at, reverse=True)
    return AdminQueue(items=items)


@router.post("/items/{kind}/{item_id}/resolve", response_model=Ok)
def resolve(
    payload: ResolveIn,
    kind: Kind,
    item_id: int = Path(ge=1),
    db: Session = Depends(get_db),
):
    """hide    -> the item is hidden; its pending reports become 'actioned'.
    restore -> the item is visible again; its pending reports become 'dismissed'
               (also how you undo a wrong auto-hide, or a hide you regret)."""
    model = Post if kind == "post" else Reply
    obj = db.get(model, item_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Item not found")

    hide = payload.action == "hide"
    obj.is_hidden = hide
    target_col = Report.post_id if kind == "post" else Report.reply_id
    db.execute(
        update(Report)
        .where(target_col == item_id, Report.status == "pending")
        .values(status="actioned" if hide else "dismissed")
    )
    db.commit()
    return Ok()