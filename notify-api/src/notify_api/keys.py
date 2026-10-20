"""API key generation and hashing.

Keys are random 256-bit tokens, so a plain SHA-256 hash is enough for storage:
only the hash and a short display prefix are kept, never the key itself.
"""

import hashlib
import hmac
import secrets

KEY_PREFIX = "ntf_"


def generate_key() -> str:
    return KEY_PREFIX + secrets.token_urlsafe(32)


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def display_prefix(key: str) -> str:
    return key[: len(KEY_PREFIX) + 6]


def matches(provided: str, expected: str) -> bool:
    return hmac.compare_digest(provided.encode(), expected.encode())
