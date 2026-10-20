import json

EMAIL = {
    "channel": "email",
    "recipient": "alex.rivera@example.com",
    "subject": "Thanks for getting in touch",
    "body": "We will reply within one business day.",
    "metadata": {"inquiryId": "inq_123", "kind": "instant_reply"},
}


def test_email_is_recorded_in_outbox_and_metadata_echoed(client, api_key):
    headers = {"X-API-Key": api_key}
    sent = client.post("/v1/notifications", json=EMAIL, headers=headers)
    assert sent.status_code == 201
    body = sent.json()
    assert body["status"] == "sent"
    assert body["metadata"] == EMAIL["metadata"]

    outbox = client.get("/v1/notifications", headers=headers).json()
    assert [n["id"] for n in outbox] == [body["id"]]


def test_outbox_is_scoped_to_the_calling_key(client, admin, api_key):
    client.post("/v1/notifications", json=EMAIL, headers={"X-API-Key": api_key})
    other = client.post("/v1/keys", json={"name": "other"}, headers=admin).json()["api_key"]
    assert client.get("/v1/notifications", headers={"X-API-Key": other}).json() == []


def test_email_channel_requires_email_recipient(client, api_key):
    bad = {**EMAIL, "recipient": "not-an-email"}
    assert client.post("/v1/notifications", json=bad, headers={"X-API-Key": api_key}).status_code == 422


def test_webhook_posts_json_to_allowed_host(client, api_key, webhook_calls):
    payload = {**EMAIL, "channel": "webhook", "recipient": "https://hooks.example.com/notify"}
    res = client.post("/v1/notifications", json=payload, headers={"X-API-Key": api_key})
    assert res.status_code == 201
    assert len(webhook_calls) == 1
    assert json.loads(webhook_calls[0].content) == {
        "subject": EMAIL["subject"], "body": EMAIL["body"], "metadata": EMAIL["metadata"],
    }


def test_webhook_to_unlisted_host_is_refused_and_logged_as_failed(client, api_key, webhook_calls):
    payload = {**EMAIL, "channel": "webhook", "recipient": "http://169.254.169.254/latest"}
    headers = {"X-API-Key": api_key}
    res = client.post("/v1/notifications", json=payload, headers=headers)
    assert res.status_code == 502
    assert webhook_calls == []
    assert client.get("/v1/notifications", headers=headers).json()[0]["status"] == "failed"


def test_webhook_upstream_error_returns_502(client, api_key):
    payload = {**EMAIL, "channel": "webhook", "recipient": "https://hooks.example.com/fail"}
    res = client.post("/v1/notifications", json=payload, headers={"X-API-Key": api_key})
    assert res.status_code == 502
    assert "webhook delivery failed" in res.json()["detail"]["error"]
