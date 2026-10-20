"""Turning retrieved passages into an answer.

With ANTHROPIC_API_KEY set, Claude writes an answer grounded in the passages
and cites them as [1], [2], ... Without a key the app only shows the passages.
"""

import os
from dataclasses import dataclass

import anthropic

from .retriever import Hit

DEFAULT_MODEL = "claude-opus-5-5"

SYSTEM_PROMPT = (
    "You answer questions using only the numbered passages provided. "
    "Cite passages inline as [1], [2], and so on. "
    "If the passages do not contain the answer, say that plainly instead of guessing. "
    "Keep answers short: a few sentences or a brief list."
)


@dataclass(frozen=True)
class Answer:
    text: str
    generated: bool  # False when no model was called


def format_passages(hits: list[Hit]) -> str:
    return "\n\n".join(
        f"[{i}] {h.chunk.doc_title} - {h.chunk.section}\n{h.chunk.text}" for i, h in enumerate(hits, 1)
    )


def generate_answer(question: str, hits: list[Hit], client: anthropic.Anthropic | None = None,
                    model: str | None = None) -> Answer:
    if not hits:
        return Answer("No matching passages found. Try different keywords.", False)
    client = client or anthropic.Anthropic()
    response = client.beta.messages.create(
        model=model or os.getenv("ANTHROPIC_MODEL", DEFAULT_MODEL),
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        output_config={"effort": "low"},
        # If the primary model declines, the API retries on Anthropic's recommended fallback model.
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        messages=[{
            "role": "user",
            "content": f"<passages>\n{format_passages(hits)}\n</passages>\n\nQuestion: {question}",
        }],
    )
    if response.stop_reason == "refusal":
        return Answer("The model declined to answer this question.", True)
    text = "".join(block.text for block in response.content if block.type == "text").strip()
    return Answer(text or "The model returned an empty answer.", True)
