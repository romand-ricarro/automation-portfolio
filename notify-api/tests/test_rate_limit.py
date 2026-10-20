from notify_api.rate_limit import RateLimiter


def test_limiter_allows_burst_then_blocks_then_refills():
    now = [0.0]
    limiter = RateLimiter(clock=lambda: now[0])

    results = [limiter.check("k", 3) for _ in range(4)]
    assert [r.allowed for r in results] == [True, True, True, False]
    assert results[2].remaining == 0
    assert results[3].retry_after == 20  # 3 per minute = one token every 20s

    now[0] = 20.0
    assert limiter.check("k", 3).allowed
    assert not limiter.check("k", 3).allowed


def test_limiter_buckets_are_per_key():
    limiter = RateLimiter(clock=lambda: 0.0)
    assert limiter.check("a", 1).allowed
    assert not limiter.check("a", 1).allowed
    assert limiter.check("b", 1).allowed


def test_api_returns_429_with_headers(client, api_key, clock):
    headers = {"X-API-Key": api_key}
    for i in range(5):
        res = client.get("/v1/notifications", headers=headers)
        assert res.status_code == 200
        assert res.headers["X-RateLimit-Remaining"] == str(4 - i)

    blocked = client.get("/v1/notifications", headers=headers)
    assert blocked.status_code == 429
    assert blocked.headers["Retry-After"] == "12"  # 5 per minute = one token every 12s

    clock.now += 12
    assert client.get("/v1/notifications", headers=headers).status_code == 200
