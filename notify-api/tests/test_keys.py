from notify_api import keys


def test_admin_endpoints_require_admin_key(client):
    assert client.post("/v1/keys", json={"name": "x"}).status_code == 401
    assert client.get("/v1/keys", headers={"X-Admin-Key": "wrong"}).status_code == 401


def test_create_key_returns_secret_once_and_stores_only_hash(client, admin):
    created = client.post("/v1/keys", json={"name": "website", "rate_limit_per_minute": 30}, headers=admin)
    assert created.status_code == 201
    body = created.json()
    assert body["api_key"].startswith("ntf_")
    assert body["prefix"] == body["api_key"][:10]
    assert body["rate_limit_per_minute"] == 30

    listed = client.get("/v1/keys", headers=admin).json()
    assert len(listed) == 1
    assert "api_key" not in listed[0]
    assert "key_hash" not in listed[0]

    stored = client.app.state.store.list_keys()[0]
    assert stored["key_hash"] == keys.hash_key(body["api_key"])


def test_default_rate_limit_applies_when_not_given(client, admin):
    body = client.post("/v1/keys", json={"name": "default"}, headers=admin).json()
    assert body["rate_limit_per_minute"] == 5


def test_revoked_key_is_rejected(client, admin, api_key):
    headers = {"X-API-Key": api_key}
    assert client.get("/v1/notifications", headers=headers).status_code == 200

    key_id = client.get("/v1/keys", headers=admin).json()[0]["id"]
    assert client.delete(f"/v1/keys/{key_id}", headers=admin).status_code == 204
    assert client.delete(f"/v1/keys/{key_id}", headers=admin).status_code == 404
    assert client.get("/v1/notifications", headers=headers).status_code == 401


def test_unknown_api_key_is_rejected(client):
    assert client.get("/v1/notifications", headers={"X-API-Key": "ntf_nope"}).status_code == 401
    assert client.get("/v1/notifications").status_code == 401
