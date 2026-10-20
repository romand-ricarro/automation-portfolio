from pathlib import Path
from types import SimpleNamespace

from docs_rag.answer import generate_answer
from docs_rag.corpus import Document, chunk_document, load_documents
from docs_rag.retriever import BM25Index, tokenize

FIXTURES = Path(__file__).parent / "fixtures"


def build():
    docs = load_documents(FIXTURES)
    return docs, BM25Index([c for d in docs for c in chunk_document(d)])


def test_load_reads_titles_from_rst_field_and_markdown_heading():
    docs, _ = build()
    assert {d.title for d in docs} == {"Community Garden Handbook", "Neighborhood Library Rules"}


def test_chunks_follow_section_headings():
    docs, index = build()
    sections = {c.section for c in index.chunks}
    assert {"Watering", "Compost", "Tools", "Borrowing", "Late returns", "Quiet hours"} <= sections
    assert not any(c.text.startswith("===") for c in index.chunks)


def test_long_sections_are_split_on_paragraphs():
    text = "# Big\n\n" + "\n\n".join(f"Paragraph {i} " + "word " * 60 for i in range(10))
    chunks = chunk_document(Document("big", "Big", text), max_chars=700)
    assert len(chunks) > 1
    assert all(len(c.text) <= 700 + 400 for c in chunks)
    assert "Paragraph 0" in chunks[0].text and "Paragraph 9" in chunks[-1].text


def test_tokenize_drops_stopwords_and_punctuation():
    assert tokenize("How do I water the Tomatoes?") == ["water", "tomatoes"]


def test_search_ranks_the_right_section_first():
    _, index = build()
    assert index.search("how often to water tomatoes")[0].chunk.section == "Watering"
    assert index.search("late fees for overdue books")[0].chunk.section == "Late returns"
    assert index.search("which bin for cardboard")[0].chunk.section == "Compost"


def test_search_with_no_matching_terms_returns_nothing():
    _, index = build()
    assert index.search("quantum chromodynamics") == []


class FakeClient:
    def __init__(self, stop_reason="end_turn", text="Water twice a week [1]."):
        self.calls = []
        response = SimpleNamespace(stop_reason=stop_reason, content=[SimpleNamespace(type="text", text=text)])
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=lambda **kw: self.calls.append(kw) or response))


def test_generate_answer_sends_numbered_passages_and_returns_text():
    _, index = build()
    hits = index.search("water tomatoes", k=2)
    client = FakeClient()
    answer = generate_answer("How often should I water tomatoes?", hits, client=client, model="test-model")

    assert answer.generated and answer.text == "Water twice a week [1]."
    call = client.calls[0]
    assert call["model"] == "test-model"
    assert "[1] Community Garden Handbook - Watering" in call["messages"][0]["content"]
    assert "Question: How often should I water tomatoes?" in call["messages"][0]["content"]


def test_generate_answer_handles_refusal_and_empty_hits():
    _, index = build()
    hits = index.search("compost", k=1)
    assert "declined" in generate_answer("q", hits, client=FakeClient(stop_reason="refusal")).text
    no_hits = generate_answer("q", [], client=FakeClient())
    assert not no_hits.generated
