# automation-portfolio

Small, self-contained automation projects. Each one runs locally with fake or public data and has its own tests.

| Project | Stack | What it shows |
|---|---|---|
| [lead-followup-n8n](./lead-followup-n8n) | n8n, JavaScript | Inquiry intake workflow: validate, log, instant reply, then follow-ups on day 1, 3 and 7, with tested Code nodes and an export that contains no credentials |
| [notify-api](./notify-api) | Python, FastAPI, SQLite, Docker | Notification service with API-key management, per-key rate limiting, an outbox and a host allowlist for webhooks |
| [docs-rag-demo](./docs-rag-demo) | Python, Streamlit, Claude API | Retrieval-augmented Q&A over public documents, with BM25 retrieval, cited answers and a UI test |
| [ops-request-dashboard](./ops-request-dashboard) | Python, Streamlit, SQLite | Internal request tracker for a made-up operations team: intake form with validation, dashboard with age highlights, filters, CSV export and an optional AI summary |

The projects fit together: the n8n workflow sends its emails through notify-api.

## Quick start

```bash
# n8n workflow tests (Node 20+)
cd lead-followup-n8n && npm test

# notify-api (Python 3.11+)
cd notify-api && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt && .venv/bin/pytest

# docs-rag-demo (Python 3.11+)
cd docs-rag-demo && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt && .venv/bin/pytest

# ops-request-dashboard (Python 3.11+)
cd ops-request-dashboard && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt && .venv/bin/pytest
```

Each project's README explains how to run it end to end. Configuration lives in `.env` files, which are never committed. Every project ships a `.env.example` with placeholders only.

## Previous work

Automation and internal tools built for a previous employer, code not public.
