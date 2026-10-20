# notify-api

A small FastAPI service that sends notifications on behalf of other apps and automations, such as the [lead follow-up workflow](../lead-followup-n8n) in this repo.

- **API-key management**: an admin creates, lists and revokes keys. Keys are shown once and stored only as SHA-256 hashes.
- **Per-key rate limiting**: a token bucket, with `X-RateLimit-*` headers and `429` plus `Retry-After` when a key is over its limit.
- **Channels**:
  - `email` is simulated. The message goes to an outbox you can read back, so the demo needs no email provider.
  - `webhook` POSTs JSON to a URL. Hosts must be listed in `WEBHOOK_ALLOWED_HOSTS`, so the service can't be made to call arbitrary internal addresses.
- **Outbox**: every send, successful or failed, is stored in SQLite and can be listed per key. `metadata` is echoed back so callers can match responses to their own records.

## Stack

Python 3.12, FastAPI, Pydantic v2, SQLite, httpx, pytest, Docker.

## API

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /health` | none | Liveness check |
| `POST /v1/keys` | `X-Admin-Key` | Create a key: `{"name": "...", "rate_limit_per_minute": 60}` |
| `GET /v1/keys` | `X-Admin-Key` | List keys (prefix only, never the secret) |
| `DELETE /v1/keys/{id}` | `X-Admin-Key` | Revoke a key |
| `POST /v1/notifications` | `X-API-Key` | Send: `{"channel": "email", "recipient": "...", "subject": "...", "body": "...", "metadata": {}}` |
| `GET /v1/notifications?limit=50` | `X-API-Key` | List this key's outbox, newest first |

Interactive docs are at `/docs` while the server is running.

## Run it

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

```bash
cp .env.example .env   # then set ADMIN_API_KEY to a long random string
uvicorn notify_api.asgi:app --app-dir src --reload
```

In a second terminal, walk through the API with the fake data in `sample-data/notifications.json`:

```bash
ADMIN_API_KEY=<same value as in .env> python scripts/demo.py
```

You'll see a key being created, two notifications sent, one rejected with `422`, the rate limit kicking in with `429`, and the key revoked.

With Docker:

```bash
docker build -t notify-api .
docker run --rm -p 8000:8000 --env-file .env notify-api
```

## Limits

This is a demo, so a few things are deliberately kept simple:
- The rate limiter is in memory, so it only works with a single process. Use Redis when running several workers.
- Email is simulated. Plug a provider client into `OutboxEmailSender` to send real email.
- Sends happen inside the request. For high volume, put them on a queue.
