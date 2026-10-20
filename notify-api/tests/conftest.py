import httpx
import pytest
from fastapi.testclient import TestClient

from notify_api.config import Settings
from notify_api.main import create_app

ADMIN_KEY = "test-admin-key-0123456789"


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture
def webhook_calls() -> list[httpx.Request]:
    return []


@pytest.fixture
def client(tmp_path, clock, webhook_calls):
    def handler(request: httpx.Request) -> httpx.Response:
        webhook_calls.append(request)
        if request.url.path == "/fail":
            return httpx.Response(500)
        return httpx.Response(200)

    settings = Settings(
        admin_api_key=ADMIN_KEY,
        database_path=str(tmp_path / "test.db"),
        default_rate_limit_per_minute=5,
        webhook_allowed_hosts=frozenset({"hooks.example.com"}),
    )
    app = create_app(settings, http_client=httpx.Client(transport=httpx.MockTransport(handler)), clock=clock)
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin() -> dict[str, str]:
    return {"X-Admin-Key": ADMIN_KEY}


@pytest.fixture
def api_key(client, admin) -> str:
    return client.post("/v1/keys", json={"name": "demo"}, headers=admin).json()["api_key"]
