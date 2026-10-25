import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user_id
from ..models import Bookmark, Group, GroupMember, Post, PostSupport, Reply, Report, User
from ..schemas import (
    Deleted,
    GroupOut,
    Ok,
    PostIn,
    PostList,
    PostOut,
    ReplyIn,
    ReplyList,
    ReplyOut,
    ReportIn,
    Tag,
    ToggleIn,
)

router = APIRouter(prefix="/api/community")

ANONYMOUS_NAME = "Anonymous Member"
MAX_POSTS_PER_HOUR = 5
MAX_REPLIES_PER_HOUR = 20
MAX_REPORTS_PER_HOUR = 10
AUTO_HIDE_AT = 3          # this many different people reporting hides an item until a moderator looks
SELF_HARM = "self_harm_concern"


# ---------------- Groups ----------------
def get_group(db: Session, slug: str) -> Group:
    group = db.scalar(select(Group).where(Group.slug == slug))
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


def is_member(db: Session, group_id: int, user_id: int) -> bool:
    return db.get(GroupMember, (group_id, user_id)) is not None  # key order = column order: group, user


def group_outs(db: Session, groups: list[Group], me_id: int) -> list[GroupOut]:
    ids = [g.id for g in groups]
    counts = dict(
        db.execute(
            select(GroupMember.group_id, func.count()).where(GroupMember.group_id.in_(ids)).group_by(GroupMember.group_id)
        ).all()
    )
    mine = set(db.scalars(select(GroupMember.group_id).where(GroupMember.user_id == me_id, GroupMember.group_id.in_(ids))).all())
    return [
        GroupOut(slug=g.slug, name=g.name, description=g.description, member_count=counts.get(g.id, 0), joined=g.id in mine)
        for g in groups
    ]


@router.get("/groups", response_model=list[GroupOut])
def list_groups(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return group_outs(db, list(db.scalars(select(Group).order_by(Group.id)).all()), user_id)


@router.put("/groups/{slug}/membership", response_model=GroupOut)
def set_membership(
    payload: ToggleIn,
    slug: str = Path(min_length=1, max_length=50),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    group = get_group(db, slug)
    row = db.get(GroupMember, (group.id, user_id))
    try:
        if payload.on and row is None:
            db.add(GroupMember(group_id=group.id, user_id=user_id))
            db.commit()
        elif not payload.on and row is not None:
            db.delete(row)
            db.commit()
    except IntegrityError:  # double-click race: already a member
        db.rollback()
    return group_outs(db, [group], user_id)[0]


# ---------------- Posts ----------------
def decorate(db: Session, rows: list[tuple[Post, str | None]], me_id: int) -> list[PostOut]:
    """Turn (post, author username) rows into PostOut, with the four new fields filled in.
    Three small grouped queries for the whole page, not three per post."""
    if not rows:
        return []
    ids = [p.id for p, _ in rows]

    # support count + "did I support it?" in one pass
    supports = {
        pid: (total, mine)
        for pid, total, mine in db.execute(
            select(
                PostSupport.post_id,
                func.count(),
                func.count().filter(PostSupport.user_id == me_id),
            )
            .where(PostSupport.post_id.in_(ids))
            .group_by(PostSupport.post_id)
        ).all()
    }
    replies = dict(
        db.execute(
            select(Reply.post_id, func.count())
            .where(Reply.post_id.in_(ids), Reply.is_hidden.is_(False))
            .group_by(Reply.post_id)
        ).all()
    )
    saved = set(db.scalars(select(Bookmark.post_id).where(Bookmark.user_id == me_id, Bookmark.post_id.in_(ids))).all())
    group_ids = {p.group_id for p, _ in rows if p.group_id}
    groups = (
        {g.id: g for g in db.scalars(select(Group).where(Group.id.in_(group_ids))).all()} if group_ids else {}
    )

    return [
        PostOut(
            id=p.id,
            title=p.title,
            body=p.body,
            tag=p.tag,
            anonymous=p.anonymous,
            author=ANONYMOUS_NAME if p.anonymous else (name or "Member"),
            is_mine=p.author_id == me_id,
            created_at=p.created_at,
            support_count=supports.get(p.id, (0, 0))[0],
            supported_by_me=bool(supports.get(p.id, (0, 0))[1]),
            reply_count=replies.get(p.id, 0),
            bookmarked_by_me=p.id in saved,
            group=groups[p.group_id].slug if p.group_id in groups else None,
            group_name=groups[p.group_id].name if p.group_id in groups else None,
        )
        for p, name in rows
    ]


def get_visible_post(db: Session, post_id: int) -> Post:
    post = db.get(Post, post_id)
    if post is None or post.is_hidden:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


def one_post(db: Session, post: Post, me_id: int) -> PostOut:
    username = db.scalar(select(User.username).where(User.id == post.author_id))
    return decorate(db, [(post, username)], me_id)[0]


@router.get("/posts", response_model=PostList)
def list_posts(
    tag: Tag | None = None,
    saved: bool = False,
    group: str | None = Query(default=None, max_length=50),
    before: int | None = Query(default=None, ge=1),
    limit: int = Query(default=10, ge=1, le=30),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    q = select(Post, User.username).join(User, User.id == Post.author_id).where(Post.is_hidden.is_(False))
    if saved:  # only this user's bookmarks (they're private, so it's always "mine")
        q = q.join(Bookmark, and_(Bookmark.post_id == Post.id, Bookmark.user_id == user_id))
    if group:  # one group's feed (anyone can read it; only members can post, see create_post)
        q = q.where(Post.group_id == get_group(db, group).id)
    elif not saved:  # the main feed never shows group posts. Your own bookmarks still can.
        q = q.where(Post.group_id.is_(None))
    if tag:
        q = q.where(Post.tag == tag)
    if before:
        q = q.where(Post.id < before)
    rows = db.execute(q.order_by(Post.id.desc()).limit(limit + 1)).all()  # one extra row = "is there more?"

    has_more = len(rows) > limit
    rows = rows[:limit]
    return PostList(
        posts=decorate(db, [(p, name) for p, name in rows], user_id),
        next_before=rows[-1][0].id if has_more else None,
    )


@router.post("/posts", response_model=PostOut, status_code=201)
def create_post(
    payload: PostIn,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1)
    recent = db.scalar(
        select(func.count()).select_from(Post).where(Post.author_id == user_id, Post.created_at > since)
    )
    if recent >= MAX_POSTS_PER_HOUR:
        raise HTTPException(status_code=429, detail="You're posting too quickly. Please try again later.")

    group_id = None
    if payload.group:
        group = get_group(db, payload.group)
        if not is_member(db, group.id, user_id):
            raise HTTPException(status_code=403, detail="Join this group to post in it.")
        group_id = group.id

    post = Post(author_id=user_id, group_id=group_id, **payload.model_dump(exclude={"group"}))
    db.add(post)
    db.commit()
    db.refresh(post)
    return one_post(db, post, user_id)


@router.delete("/posts/{post_id}", response_model=Deleted)
def delete_post(
    post_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    post = db.get(Post, post_id)
    # Same 404 for "doesn't exist" and "not yours", so nobody can probe other people's post ids
    if post is None or post.author_id != user_id:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)  # replies, supports and bookmarks go with it (ON DELETE CASCADE)
    db.commit()
    return Deleted()


# ---------------- Support and bookmark ----------------
def _set_flag(db: Session, model, post_id: int, user_id: int, on: bool) -> None:
    """Add or remove one (post, user) row. Idempotent: asking for the state it's already in does nothing."""
    row = db.scalar(select(model).where(model.post_id == post_id, model.user_id == user_id))
    try:
        if on and row is None:
            db.add(model(post_id=post_id, user_id=user_id))
            db.commit()
        elif not on and row is not None:
            db.delete(row)
            db.commit()
    except IntegrityError:  # a double-click raced us; the row is already there
        db.rollback()


@router.put("/posts/{post_id}/support", response_model=PostOut)
def set_support(
    payload: ToggleIn,
    post_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    post = get_visible_post(db, post_id)
    _set_flag(db, PostSupport, post_id, user_id, payload.on)
    return one_post(db, post, user_id)


@router.put("/posts/{post_id}/bookmark", response_model=PostOut)
def set_bookmark(
    payload: ToggleIn,
    post_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    post = get_visible_post(db, post_id)
    _set_flag(db, Bookmark, post_id, user_id, payload.on)
    return one_post(db, post, user_id)


# ---------------- Replies ----------------
def reply_outs(post: Post, op_username: str | None, rows: list[tuple[Reply, str | None]], me_id: int) -> list[ReplyOut]:
    """Work out who each reply is "from". Rows must be oldest first.

    - The thread starter always shows as the post's own name (so an anonymous post stays anonymous,
      even if its author replies) with is_op=True, which the page shows as an "Author" badge.
    - Other anonymous repliers get "Anonymous 1", "Anonymous 2"... by order of first appearance, so
      a conversation between two anonymous people stays readable. Nothing is stored: it's recomputed
      from the thread each time, and hidden replies still take a number so the others never shift.
    """
    op_label = ANONYMOUS_NAME if post.anonymous else (op_username or "Member")
    numbers: dict[int, int] = {}
    out: list[ReplyOut] = []
    for r, username in rows:
        is_op = r.author_id == post.author_id
        if is_op:
            name = op_label
        elif r.anonymous:
            name = f"Anonymous {numbers.setdefault(r.author_id, len(numbers) + 1)}"
        else:
            name = username or "Member"
        if r.is_hidden:
            continue
        out.append(
            ReplyOut(
                id=r.id,
                post_id=r.post_id,
                body=r.body,
                author=name,
                is_op=is_op,
                is_mine=r.author_id == me_id,
                created_at=r.created_at,
            )
        )
    return out


def thread(db: Session, post: Post, me_id: int) -> list[ReplyOut]:
    rows = db.execute(
        select(Reply, User.username)
        .join(User, User.id == Reply.author_id)
        .where(Reply.post_id == post.id)
        .order_by(Reply.id)
    ).all()
    op_username = db.scalar(select(User.username).where(User.id == post.author_id))
    return reply_outs(post, op_username, [(r, n) for r, n in rows], me_id)


@router.get("/posts/{post_id}/replies", response_model=ReplyList)
def list_replies(
    post_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    post = get_visible_post(db, post_id)
    return ReplyList(replies=thread(db, post, user_id))


@router.post("/posts/{post_id}/replies", response_model=ReplyOut, status_code=201)
def create_reply(
    payload: ReplyIn,
    post_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    post = get_visible_post(db, post_id)
    if post.group_id and not is_member(db, post.group_id, user_id):
        raise HTTPException(status_code=403, detail="Join this group to reply.")

    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1)
    recent = db.scalar(
        select(func.count()).select_from(Reply).where(Reply.author_id == user_id, Reply.created_at > since)
    )
    if recent >= MAX_REPLIES_PER_HOUR:
        raise HTTPException(status_code=429, detail="You're replying too quickly. Please try again later.")

    reply = Reply(post_id=post_id, author_id=user_id, body=payload.body, anonymous=payload.anonymous)
    db.add(reply)
    db.commit()
    # Build the whole thread and pick the new reply out of it, so its label ("Anonymous 2", "Author"...)
    # is exactly what everyone will see on the next load.
    return next(r for r in thread(db, post, user_id) if r.id == reply.id)


@router.delete("/replies/{reply_id}", response_model=Deleted)
def delete_reply(
    reply_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    reply = db.get(Reply, reply_id)
    if reply is None or reply.author_id != user_id:  # same 404 for "missing" and "not yours"
        raise HTTPException(status_code=404, detail="Reply not found")
    db.delete(reply)
    db.commit()
    return Deleted()


# ---------------- Reports ----------------
def file_report(db: Session, user_id: int, payload: ReportIn, *, post: Post | None = None, reply: Reply | None = None) -> Ok:
    target = post or reply
    assert target is not None
    if target.author_id == user_id:
        raise HTTPException(status_code=400, detail="You can't report your own content.")

    target_col = Report.post_id if post else Report.reply_id
    already = db.scalar(select(Report.id).where(Report.reporter_id == user_id, target_col == target.id))
    if already:  # reporting twice is a no-op, and doesn't count twice toward auto-hide
        return Ok()

    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=1)
    recent = db.scalar(select(func.count()).select_from(Report).where(Report.reporter_id == user_id, Report.created_at > since))
    if recent >= MAX_REPORTS_PER_HOUR:
        raise HTTPException(status_code=429, detail="You're sending reports too quickly. Please try again later.")

    try:
        db.add(
            Report(
                reporter_id=user_id,
                post_id=post.id if post else None,
                reply_id=reply.id if reply else None,
                reason=payload.reason,
                note=payload.note or None,
            )
        )
        db.commit()
    except IntegrityError:  # double-click race
        db.rollback()
        return Ok()

    # Auto-hide: enough DIFFERENT people with a pending report. "Self-harm concern" reports don't count
    # here: hiding someone's cry for help would cut them off. Those go to the top of the admin list instead.
    people = db.scalar(
        select(func.count(func.distinct(Report.reporter_id))).where(
            target_col == target.id, Report.status == "pending", Report.reason != SELF_HARM
        )
    )
    if people >= AUTO_HIDE_AT and not target.is_hidden:
        target.is_hidden = True
        db.commit()
    return Ok()


@router.post("/posts/{post_id}/report", response_model=Ok)
def report_post(
    payload: ReportIn,
    post_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    return file_report(db, user_id, payload, post=get_visible_post(db, post_id))


@router.post("/replies/{reply_id}/report", response_model=Ok)
def report_reply(
    payload: ReportIn,
    reply_id: int = Path(ge=1),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    reply = db.get(Reply, reply_id)
    if reply is None or reply.is_hidden:
        raise HTTPException(status_code=404, detail="Reply not found")
    get_visible_post(db, reply.post_id)  # a reply under a hidden post is hidden too
    return file_report(db, user_id, payload, reply=reply)