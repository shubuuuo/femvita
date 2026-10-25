import xml.etree.ElementTree as ET

from fastapi import HTTPException

from .external import HOUR, cached_get
from .text import clean, shorten

URL = "https://wsearch.nlm.nih.gov/ws/query"


def search_topics(term: str, limit: int = 3) -> list[dict]:
    xml_text = cached_get(
        URL,
        {"db": "healthTopics", "term": term, "retmax": limit, "rettype": "brief", "tool": "femvita"},
        ttl=12 * HOUR,  # MedlinePlus asks for 12-24 hour caching
        as_json=False,
    )
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        raise HTTPException(status_code=502, detail="Unexpected response from MedlinePlus.")

    topics = []
    for doc in root.iter("document"):
        fields: dict[str, str] = {}
        for c in doc.findall("content"):
            # itertext() also picks up the <span class="qt0"> highlight tags; clean() strips the rest
            fields.setdefault((c.get("name") or "").lower(), clean("".join(c.itertext())))
        if not fields.get("title") or not doc.get("url"):
            continue
        topics.append(
            dict(
                title=fields["title"],
                summary=shorten(fields.get("fullsummary", ""), 450),
                url=doc.get("url"),
                snippet=fields.get("snippet") or None,
            )
        )
    return topics[:limit]