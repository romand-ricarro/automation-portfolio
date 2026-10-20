# Lead follow-up workflow (n8n)

An n8n workflow for a fictional small business ("Example Plumbing Co."). When a customer inquiry comes in it:

1. **Validates** the request (name and a usable email are required).
2. **Logs** the inquiry.
3. **Sends an instant reply** to the customer.
4. **Sends follow-up reminders on day 1, 3 and 7** until the lead is marked `replied` or `closed`.

All names, emails and phone numbers in `sample-data/` are made up (`example.com` / `555-01xx`).

## How it works

```
POST /webhook/lead-inquiry ─► Validate inquiry ─► Is valid? ─► Log inquiry ─► Send instant reply ─► 201 {id}
                                                       └──────► 400 {errors}

POST /webhook/lead-status ─► Apply status update ─► 200 / 400 / 404

Every hour ─► Find due follow-ups ─► Send follow-up ─► Mark follow-up sent
```

- Emails are sent through the [notify-api](../notify-api) service in this repo (`POST /v1/notifications`, channel `email`). You can point `NOTIFY_API_URL` at any endpoint that accepts the same JSON and echoes back `metadata`.
- If the workflow was paused and several follow-ups are overdue, only the latest one is sent. The older ones are marked `skipped`, so a lead never gets a burst of emails.
- Leads are stored in the workflow's static data, which keeps the demo free of any database or credential setup. Static data only persists for **active** (production) executions, not manual test runs. For real use, swap it for a database table, because concurrent executions can overwrite each other's static data.

## Stack

n8n (Webhook, IF, Code, HTTP Request, Schedule Trigger, Respond to Webhook nodes), JavaScript, Node's built-in test runner.

## Files

| Path | What it is |
|---|---|
| `workflow.json` | The n8n export. Import this. |
| `src/nodes/*.js` | Source for the Code nodes. |
| `scripts/build-workflow.mjs` | Builds `workflow.json` from the sources (`npm run build`). |
| `tests/workflow.test.mjs` | Runs the Code nodes from `workflow.json` against fake data and checks the export has no credentials. |
| `sample-data/inquiries.json` | Five fake inquiries, one invalid on purpose. |
| `scripts/send-sample-inquiries.sh` | Posts the sample inquiries to the webhook. |

## Run it

Requirements: Node 20+, and Docker or `npx n8n` for n8n itself.

```bash
npm test
```

To try it end to end:

1. Start the notification service from `../notify-api` and create an API key (see its README).
2. `cp .env.example .env` and fill in `NOTIFY_API_URL` and `NOTIFY_API_KEY`.
3. `docker compose up`, open http://localhost:5678, then **Import from file** and choose `workflow.json`.
4. Activate the workflow.
5. `./scripts/send-sample-inquiries.sh`. Each valid inquiry returns `{ "ok": true, "id": "inq_..." }` and an instant reply appears in notify-api's outbox (`GET /v1/notifications`).
6. Close a lead to stop its follow-ups:
   ```bash
   curl -X POST http://localhost:5678/webhook/lead-status -H 'Content-Type: application/json' -d '{"id":"inq_...","status":"closed"}'
   ```

The workflow reads its settings with `$env`, so n8n must run with `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`. The included `docker-compose.yml` sets this. The export contains no credentials: the API key only ever comes from the environment.
