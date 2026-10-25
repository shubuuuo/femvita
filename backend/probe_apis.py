"""Run once from the backend folder:  python probe_apis.py
Checks that the ingredient names and exercise searches in the code really exist upstream.
Fix any line marked MISSING / NO RESULT by editing PHASES (themealdb.py) or MORNING_TERMS (wger.py)."""
import httpx

from app.services.themealdb import PHASES
from app.services.wger import MORNING_TERMS

UA = {"User-Agent": "FemVita/0.1 (probe)"}
with httpx.Client(timeout=15, headers=UA, follow_redirects=True) as c:
    print("== TheMealDB ingredients ==")
    names = {m["strIngredient"].lower().replace(" ", "_") for m in c.get(
        "https://www.themealdb.com/api/json/v1/1/list.php?i=list").json()["meals"]}
    for phase, info in PHASES.items():
        for ing in info["ingredients"]:
            if ing not in names:
                print(f"MISSING  {phase}: {ing}")
                continue
            meals = c.get("https://www.themealdb.com/api/json/v1/1/filter.php", params={"i": ing}).json()["meals"]
            print(f"ok       {phase}: {ing} -> {len(meals or [])} meals")

    print("\n== wger searches (shows the best match for each term) ==")
    from app.services.wger import find_exercise
    for term in MORNING_TERMS:
        try:
            card = find_exercise(term)
        except Exception as exc:  # the real error, not a generic 502
            print(f"ERROR     {term!r}: {exc!r}")
            continue
        print(f"{'ok' if card else 'NO RESULT':9}{term!r} -> {card and card['name']!r} (image: {bool(card and card['image'])})")

    print("\n== MedlinePlus ==")
    for term in ("menstruation", "polycystic ovary syndrome", "sleep", "stress"):
        x = c.get("https://wsearch.nlm.nih.gov/ws/query", params={"db": "healthTopics", "term": term, "retmax": 1, "tool": "femvita"}).text
        print(f"{'ok' if '<document' in x else 'NO RESULT':9}{term}")