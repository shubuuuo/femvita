import re
from concurrent.futures import ThreadPoolExecutor

from fastapi import HTTPException

from .external import DAY, cached_get
from .text import clean, shorten

BASE = "https://wger.de/api/v2"
ENGLISH = 2  # wger's language id for English

# wger is an exercise library, not a routine library, so the "routine" is our own short list of
# gentle, no-jumping moves. Each term is searched in wger by name; terms with no match are skipped.
MORNING_TERMS = ["glute bridge", "bird dog", "cat", "bodyweight squat", "calf raise", "plank"]


def _names(items) -> list[str]:
    out = []
    for it in items or []:
        name = (it.get("name_en") or it.get("name")) if isinstance(it, dict) else None
        if name:
            out.append(name)
    return out


def _abs(url: str | None) -> str | None:
    if not url:
        return None
    return url if url.startswith("http") else f"https://wger.de{url}"


def _card(info: dict) -> dict | None:
    """Turn one /exerciseinfo/ result into the small card the frontend shows."""
    tr = next((t for t in info.get("translations", []) if t.get("language") == ENGLISH), None)
    if not tr or not tr.get("name"):
        return None
    images = info.get("images") or []
    main = next((i for i in images if i.get("is_main")), images[0] if images else None)
    credit = (main or {}).get("license_author") or info.get("license_author") or tr.get("license_author")
    return dict(
        id=info["id"],
        name=tr["name"],
        description=shorten(clean(tr.get("description") or ""), 400),
        muscles=_names(info.get("muscles")),
        muscles_secondary=_names(info.get("muscles_secondary")),
        equipment=_names(info.get("equipment")) or ["Bodyweight"],
        image=_abs((main or {}).get("image")),
        credit=credit or None,
    )


def find_exercise(term: str) -> dict | None:
    # wger removed /exercise/search/. The supported search is name__search on /exerciseinfo/,
    # which also returns the full details, so one request is enough.
    data = cached_get(
        f"{BASE}/exerciseinfo/",
        {"name__search": term, "language__code": "en", "limit": 10, "format": "json"},
        ttl=DAY,
    )
    cards = [c for c in (_card(i) for i in data.get("results", [])) if c]
    word = re.compile(rf"\b{re.escape(term)}\b", re.I)
    # Best match first: the term appears as a whole word in the name, then has a picture
    cards.sort(key=lambda c: (not word.search(c["name"]), not c["image"]))
    return cards[0] if cards else None


def _move_for_term(term: str) -> tuple[dict | None, bool]:
    """(card or None, upstream_failed)"""
    try:
        return find_exercise(term), False
    except HTTPException:
        return None, True


def morning_moves(limit: int = 5) -> list[dict]:
    with ThreadPoolExecutor(max_workers=len(MORNING_TERMS)) as pool:
        results = list(pool.map(_move_for_term, MORNING_TERMS))
    if all(failed for _, failed in results):
        raise HTTPException(status_code=502, detail="The exercise provider isn't responding right now.")
    seen, moves = set(), []
    for card, _ in results:
        if card and card["id"] not in seen:
            seen.add(card["id"])
            moves.append(card)
    return moves[:limit]