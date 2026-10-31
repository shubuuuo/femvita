import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

COOKIE_NAME = "femvita_session"

_hasher = PasswordHasher()  # argon2id with the library's recommended settings


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(stored_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(stored_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def needs_rehash(stored_hash: str) -> bool:
    return _hasher.check_needs_rehash(stored_hash)


# Used when the email doesn't exist, so a failed login takes as long as a real one
DUMMY_HASH = _hasher.hash("not-a-real-password")


def new_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    # Tokens are long random strings, so a plain SHA-256 is enough (no slow hash needed)
    return hashlib.sha256(token.encode()).hexdigest()