import random
import re
from datetime import date

from ..config import settings
from .external import DAY, cached_get

# Free "test" key is 1. Put a supporter key in .env (THEMEALDB_KEY=...) if the app ever gets real traffic.
BASE = "https://www.themealdb.com/api/json/v1"

# Ingredient keywords per phase. The free tier can only filter by ONE ingredient at a time, so we
# filter by each keyword and merge. Names must match TheMealDB's ingredient list (underscores for spaces).
PHASES = {
    "menstrual": dict(
        label="Menstrual",
        why="Iron-rich, warming meals can feel good while you're bleeding. Pair beans or lentils with something "
        "high in vitamin C (tomato, peppers, lemon) to help your body absorb the iron.",
        ingredients=["lentils", "spinach", "chickpeas", "beef"],
    ),
    "follicular": dict(
        label="Follicular",
        why="Energy often feels higher here, so lighter, fresh meals built around vegetables and good protein tend to suit it.",
        ingredients=["broccoli", "eggs", "chicken", "carrots"],
    ),
    "ovulatory": dict(
        label="Ovulatory",
        why="Fibre-rich vegetables, fish and plenty of fluids make an easy, balanced plate around ovulation.",
        ingredients=["salmon", "tomatoes", "peppers", "avocado"],
    ),
    "luteal": dict(
        label="Luteal",
        why="Some people find slow-release carbs, legumes and squash keep energy steadier in the days before a period.",
        ingredients=["sweet_potatoes", "pumpkin", "kidney_beans", "oats"],
    ),
}

def _url(path: str) -> str:
    return f"{BASE}/{settings.themealdb_key}/{path}"

def _meals(data) -> list[dict]:
    meals = data.get("meals") if isinstance(data, dict) else None
    return meals if isinstance(meals, list) else []  # TheMealDB sends null when nothing matches

def _card(m: dict) -> dict:
    return dict(id=m["idMeal"], name=m["strMeal"], thumb=m.get("strMealThumb"))

def meals_for_phase(phase: str, today: date, vegetarian: bool, limit: int = 6) -> list[dict]:
    pool: dict[str, dict] = {}
    for ing in PHASES[phase]["ingredients"]:
        for m in _meals(cached_get(_url("filter.php"), {"i": ing}, ttl=DAY)):
            pool.setdefault(m["idMeal"], _card(m))

    if vegetarian:
        veg: dict[str, dict] = {}
        for cat in ("Vegetarian", "Vegan"):
            for m in _meals(cached_get(_url("filter.php"), {"c": cat}, ttl=DAY)):
                veg.setdefault(m["idMeal"], _card(m))
        picked = {k: v for k, v in pool.items() if k in veg}
        for k, v in veg.items():  # too few matches? top up with other vegetarian meals
            if len(picked) >= limit:
                break
            picked.setdefault(k, v)
        pool = picked

    items = sorted(pool.values(), key=lambda m: m["id"])
    random.Random(f"{phase}-{today.isoformat()}").shuffle(items)  # same picks all day, new picks tomorrow
    return items[:limit]

def meal_detail(meal_id: str) -> dict | None:
    meals = _meals(cached_get(_url("lookup.php"), {"i": meal_id}, ttl=DAY))
    if not meals:
        return None
    m = meals[0]
    ingredients = []
    for i in range(1, 21):
        name = (m.get(f"strIngredient{i}") or "").strip()
        if name:
            ingredients.append(dict(name=name, measure=(m.get(f"strMeasure{i}") or "").strip()))
    steps = [s.strip() for s in re.split(r"\r?\n+", m.get("strInstructions") or "") if s.strip()]
    return dict(
        id=m["idMeal"],
        name=m["strMeal"],
        category=m.get("strCategory"),
        area=m.get("strArea"),
        thumb=m.get("strMealThumb"),
        ingredients=ingredients,
        steps=steps,
        source_url=m.get("strSource") or None,
        youtube_url=m.get("strYoutube") or None,
    )