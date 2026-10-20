"""Walks through the API against a running server using the fake sample data.

Usage: ADMIN_API_KEY=... python scripts/demo.py [base-url]
"""

import json
import os
import sys
from pathlib import Path

import httpx

base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
admin = {"X-Admin-Key": os.environ["ADMIN_API_KEY"]}
samples = json.loads((Path(__file__).parent.parent / "sample-data" / "notifications.json").read_text())

with httpx.Client(base_url=base) as http:
    created = http.post("/v1/keys", json={"name": "demo", "rate_limit_per_minute": 10}, headers=admin)
    created.raise_for_status()
    key = created.json()
    print(f"Created key {key['id']} ({key['prefix']}...), limit {key['rate_limit_per_minute']}/min")
    headers = {"X-API-Key": key["api_key"]}

    for sample in samples:
        res = http.post("/v1/notifications", json=sample, headers=headers)
        print(f"POST {sample['recipient']:<28} -> {res.status_code}  remaining={res.headers.get('X-RateLimit-Remaining')}")

    outbox = http.get("/v1/notifications", headers=headers).json()
    print(f"Outbox has {len(outbox)} notification(s)")

    codes = [http.get("/v1/notifications", headers=headers).status_code for _ in range(10)]
    print(f"10 more requests -> {codes}")

    http.delete(f"/v1/keys/{key['id']}", headers=admin).raise_for_status()
    print(f"Revoked key -> next request returns {http.get('/v1/notifications', headers=headers).status_code}")
