"""FastAPI app: API-key management (admin) and rate-limited notification sending."""

from collections.abc import Callable
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, status

from . import keys
from .config import Settings
from .models import KeyCreate, KeyCreated, KeyOut, NotificationIn, NotificationOut
from .rate_limit import RateLimiter
from .senders import OutboxEmailSender, SendError, Sender, WebhookSender
from .store import Store


def create_app(
    settings: Settings | None = None,
    http_client: httpx.Client | None = None,
    clock: Callable[[], float] | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        client = http_client or httpx.Client(timeout=settings.webhook_timeout_seconds)
        app.state.store = Store(settings.database_path)
        app.state.limiter = RateLimiter(clock) if clock else RateLimiter()
        app.state.senders = {
            "email": OutboxEmailSender(),
            "webhook": WebhookSender(client, settings.webhook_allowed_hosts),
        }
        yield
        app.state.store.close()
        if http_client is None:
            client.close()

    app = FastAPI(title="notify-api", version="1.0.0", lifespan=lifespan)

    def get_store(request: Request) -> Store:
        return request.app.state.store

    def require_admin(x_admin_key: str = Header(default="")) -> None:
        if not keys.matches(x_admin_key, settings.admin_api_key):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid admin key")

    def require_api_key(
        request: Request, response: Response, x_api_key: str = Header(default=""), store: Store = Depends(get_store)
    ) -> dict[str, Any]:
        key = store.find_active_key(keys.hash_key(x_api_key)) if x_api_key else None
        if key is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid or revoked API key")

        decision = request.app.state.limiter.check(key["id"], key["rate_limit_per_minute"])
        headers = {"X-RateLimit-Limit": str(decision.limit), "X-RateLimit-Remaining": str(decision.remaining)}
        if not decision.allowed:
            headers["Retry-After"] = str(decision.retry_after)
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "rate limit exceeded", headers=headers)
        response.headers.update(headers)
        return key

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # Admin: API keys

    @app.post("/v1/keys", status_code=201, response_model=KeyCreated, dependencies=[Depends(require_admin)])
    def create_key(body: KeyCreate, store: Store = Depends(get_store)) -> dict[str, Any]:
        api_key = keys.generate_key()
        row = store.create_key(
            name=body.name,
            prefix=keys.display_prefix(api_key),
            key_hash=keys.hash_key(api_key),
            rate_limit_per_minute=body.rate_limit_per_minute or settings.default_rate_limit_per_minute,
        )
        return {**row, "api_key": api_key}

    @app.get("/v1/keys", response_model=list[KeyOut], dependencies=[Depends(require_admin)])
    def list_keys(store: Store = Depends(get_store)) -> list[dict[str, Any]]:
        return store.list_keys()

    @app.delete("/v1/keys/{key_id}", status_code=204, dependencies=[Depends(require_admin)])
    def revoke_key(key_id: str, store: Store = Depends(get_store)) -> Response:
        if not store.revoke_key(key_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "key not found or already revoked")
        return Response(status_code=204)

    # Notifications

    @app.post("/v1/notifications", status_code=201, response_model=NotificationOut)
    def send_notification(
        body: NotificationIn,
        request: Request,
        key: dict[str, Any] = Depends(require_api_key),
        store: Store = Depends(get_store),
    ) -> dict[str, Any]:
        data = body.model_dump()
        sender: Sender = request.app.state.senders[body.channel]
        try:
            sender.send(data)
        except SendError as exc:
            record = store.add_notification(key["id"], data, "failed", str(exc))
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=record) from exc
        return store.add_notification(key["id"], data, "sent", None)

    @app.get("/v1/notifications", response_model=list[NotificationOut])
    def list_notifications(
        limit: int = Query(default=50, ge=1, le=500),
        key: dict[str, Any] = Depends(require_api_key),
        store: Store = Depends(get_store),
    ) -> list[dict[str, Any]]:
        return store.list_notifications(key["id"], limit)

    return app
