"""Settings loaded from environment variables."""

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    admin_api_key: str
    database_path: str = "notify.db"
    default_rate_limit_per_minute: int = 60
    webhook_allowed_hosts: frozenset[str] = field(default_factory=frozenset)
    webhook_timeout_seconds: float = 5.0

    @classmethod
    def from_env(cls) -> "Settings":
        admin_key = os.getenv("ADMIN_API_KEY", "")
        if len(admin_key) < 16:
            raise RuntimeError("ADMIN_API_KEY must be set to at least 16 characters (see .env.example)")
        hosts = os.getenv("WEBHOOK_ALLOWED_HOSTS", "")
        return cls(
            admin_api_key=admin_key,
            database_path=os.getenv("DATABASE_PATH", "notify.db"),
            default_rate_limit_per_minute=int(os.getenv("DEFAULT_RATE_LIMIT_PER_MINUTE", "60")),
            webhook_allowed_hosts=frozenset(h.strip().lower() for h in hosts.split(",") if h.strip()),
            webhook_timeout_seconds=float(os.getenv("WEBHOOK_TIMEOUT_SECONDS", "5")),
        )
