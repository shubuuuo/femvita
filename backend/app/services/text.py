import html
import re

_BLOCK_END = re.compile(r"</p>|<br\s*/?>|</li>", re.I)
_TAG = re.compile(r"<[^>]+>")


def clean(raw: str) -> str:
    """HTML (or text with highlight spans) -> plain text."""
    s = _BLOCK_END.sub(" ", raw)
    s = _TAG.sub("", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def shorten(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
    if end > limit * 0.5:  # a full sentence fits: stop there
        return cut[: end + 1]
    return cut.rsplit(" ", 1)[0] + "…"