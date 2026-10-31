"""Run ONCE from backend/ before the 1c switch, if user 1 (your existing data) has no email yet:
    python claim_demo.py
It gives user 1 an email, password and profile, and makes it a moderator.
It refuses to do anything if user 1 already has an email."""
import datetime as dt
import getpass
import re

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import User
from app.security import hash_password

with SessionLocal() as db:
    user = db.get(User, 1)
    if user is None:
        raise SystemExit("There is no user 1 to claim. Just register normally.")
    if user.email is not None:
        raise SystemExit(f"User 1 already belongs to {user.email}. Nothing to do.")

    email = input("Email: ").strip().lower()
    username = input(f"Username [{user.username or ''}]: ").strip() or (user.username or "")
    full_name = input("Full name: ").strip()
    try:
        birthday = dt.date.fromisoformat(input("Birthday (YYYY-MM-DD): ").strip())
    except ValueError:
        raise SystemExit("That birthday isn't in YYYY-MM-DD form.")
    password = getpass.getpass("Password (10+ characters): ")
    if getpass.getpass("Repeat password: ") != password:
        raise SystemExit("The passwords don't match.")

    if "@" not in email or len(email) > 254:
        raise SystemExit("That doesn't look like an email address.")
    if len(password) < 10 or len(password) > 128:
        raise SystemExit("The password needs 10 to 128 characters.")
    if not re.fullmatch(r"[A-Za-z0-9_.]{3,30}", username):
        raise SystemExit("Usernames are 3-30 characters: letters, numbers, dots and underscores.")
    if not full_name or len(full_name) > 80:
        raise SystemExit("Please enter a name of up to 80 characters.")
    if db.scalar(select(User.id).where(User.email == email, User.id != 1)):
        raise SystemExit("Another account already uses that email.")
    if db.scalar(select(User.id).where(func.lower(User.username) == username.lower(), User.id != 1)):
        raise SystemExit("Another account already uses that username.")

    user.email = email
    user.username = username
    user.full_name = full_name
    user.birthday = birthday
    user.password_hash = hash_password(password)
    user.is_admin = True
    db.commit()
    print("Done. User 1 is now yours. Sign in with that email and password.")