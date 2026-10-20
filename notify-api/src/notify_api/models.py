"""Request and response bodies."""

import re
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class KeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    rate_limit_per_minute: int | None = Field(default=None, ge=1, le=10_000)


class KeyOut(BaseModel):
    id: str
    name: str
    prefix: str
    rate_limit_per_minute: int
    created_at: str
    revoked_at: str | None


class KeyCreated(KeyOut):
    api_key: str = Field(description="Shown once. Store it somewhere safe.")


class NotificationIn(BaseModel):
    channel: Literal["email", "webhook"]
    recipient: str = Field(min_length=3, max_length=2048)
    subject: str = Field(default="", max_length=200)
    body: str = Field(min_length=1, max_length=10_000)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def check_recipient(self) -> "NotificationIn":
        if self.channel == "email" and not EMAIL_RE.match(self.recipient):
            raise ValueError("recipient must be an email address for the email channel")
        return self


class NotificationOut(BaseModel):
    id: str
    channel: str
    recipient: str
    subject: str
    body: str
    metadata: dict[str, Any]
    status: Literal["sent", "failed"]
    error: str | None
    created_at: str
