"""Optional AI summary of open requests.

Only used when ANTHROPIC_API_KEY is set. Without it the app hides the button.
"""

import os

DEFAULT_MODEL = "claude-opus-5-5"
MAX_ROWS = 200  # keep the prompt small


def summary_enabled() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def build_prompt(open_requests: list[dict]) -> str:
    lines = [
        f"- #{r['id']} [{r['priority']}] {r['team']} / {r['request_type']}: {r['title']} "
        f"(status {r['status']}, {r['age_hours']:.0f}h old)"
        for r in open_requests[:MAX_ROWS]
    ]
    return (
        "Here are the open requests for an operations team:\n"
        + "\n".join(lines)
        + "\n\nWrite a short summary for the team lead: the main themes, which teams are most "
        "behind, and the oldest or most urgent items to look at first. Use at most 8 bullet points. "
        "Only use the information above."
    )


def summarize(open_requests: list[dict], client=None) -> str:
    if not open_requests:
        return "There are no open requests."
    import anthropic  # imported here so the app runs without the package being used

    client = client or anthropic.Anthropic()
    response = client.beta.messages.create(
        model=os.getenv("ANTHROPIC_MODEL") or DEFAULT_MODEL,
        max_tokens=16000,
        output_config={"effort": "low"},
        # If the model declines, the API retries on a fallback model.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{"role": "user", "content": build_prompt(open_requests)}],
    )
    if response.stop_reason == "refusal":
        return "The model declined to summarize these requests."
    return "".join(b.text for b in response.content if b.type == "text").strip()
