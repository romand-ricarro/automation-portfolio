from types import SimpleNamespace

from ops_dashboard.summary import build_prompt, summarize, summary_enabled

OPEN = [{"id": 7, "priority": "Urgent", "team": "Warehouse", "request_type": "Equipment repair",
         "title": "Loading dock door stuck", "status": "New", "age_hours": 51.2}]


class FakeClient:
    """Stands in for the API client so no network call or key is needed."""

    def __init__(self, stop_reason="end_turn"):
        self.calls = []
        response = SimpleNamespace(stop_reason=stop_reason,
                                   content=[SimpleNamespace(type="text", text="- Warehouse is behind.")])
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=lambda **kw: self.calls.append(kw) or response))


def test_summary_is_disabled_without_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert not summary_enabled()


def test_prompt_lists_each_open_request():
    assert "#7 [Urgent] Warehouse / Equipment repair: Loading dock door stuck (status New, 51h old)" in build_prompt(OPEN)


def test_summarize_returns_model_text_and_handles_refusal():
    client = FakeClient()
    assert summarize(OPEN, client=client) == "- Warehouse is behind."
    assert "Loading dock door stuck" in client.calls[0]["messages"][0]["content"]
    assert "declined" in summarize(OPEN, client=FakeClient(stop_reason="refusal"))
    assert summarize([], client=FakeClient()) == "There are no open requests."
