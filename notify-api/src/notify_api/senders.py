"""Delivery channels.

`email` is simulated: the message is only recorded in the outbox, so the demo
runs without an email provider. Swap `OutboxEmailSender` for a real provider
client to send for real. `webhook` POSTs the notification as JSON to the
recipient URL.
"""

from typing import Any, Protocol
from urllib.parse import urlsplit

import httpx


class SendError(Exception):
    pass


class Sender(Protocol):
    def send(self, notification: dict[str, Any]) -> None: ...


class OutboxEmailSender:
    def send(self, notification: dict[str, Any]) -> None:
        return None


class WebhookSender:
    def __init__(self, client: httpx.Client, allowed_hosts: frozenset[str]):
        self._client = client
        self._allowed_hosts = allowed_hosts

    def send(self, notification: dict[str, Any]) -> None:
        url = notification["recipient"]
        parts = urlsplit(url)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            raise SendError("webhook recipient must be an http(s) URL")
        # Without an allowlist this endpoint could be used to make the server call arbitrary hosts.
        if parts.hostname.lower() not in self._allowed_hosts:
            raise SendError(f"webhook host '{parts.hostname}' is not in WEBHOOK_ALLOWED_HOSTS")
        try:
            response = self._client.post(
                url,
                json={k: notification[k] for k in ("subject", "body", "metadata")},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise SendError(f"webhook delivery failed: {exc}") from exc
