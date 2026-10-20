# docs-rag-demo

A small retrieval-augmented generation (RAG) demo: ask questions about a set of **public documents** and get an answer that cites the passages it came from. By default the corpus is eight Python Enhancement Proposals (PEP 1, 8, 20, 257, 343, 484, 498 and 572). PEPs are in the public domain or released under CC0, which makes them safe to use.

- **Retrieval**: documents are split into chunks along their section headings, then ranked with BM25, a keyword-ranking algorithm implemented here in about 50 lines. It needs no embeddings or vector database, and runs offline.
- **Generation (optional)**: with `ANTHROPIC_API_KEY` set, the top passages go to Claude, which answers only from them and cites them as `[1]`, `[2]`. Requests opt into the API's server-side fallback (`fallbacks="default"`): if the model declines, the API retries on a fallback model.
- **UI**: Streamlit, with a question box, the answer, and expandable source passages with scores and links.

## Stack

Python 3.12, Streamlit, Anthropic Python SDK, pytest (including Streamlit's `AppTest` for the UI).

## Run it

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

The tests use two small made-up documents in `tests/fixtures/`. They need neither a network connection nor an API key.

To run the app on the public corpus:

```bash
python scripts/fetch_docs.py      # downloads the PEPs into data/ (not committed)
cp .env.example .env              # optional: add ANTHROPIC_API_KEY
streamlit run src/app.py
```

Try asking "How long should lines be?", "What is the walrus operator for?" or "How should docstrings be formatted?"

To use your own documents, point `DOCS_DIR` at a folder of `.rst`, `.md` or `.txt` files. You can also run against the fixtures with `DOCS_DIR=tests/fixtures streamlit run src/app.py`.

## Layout

| Path | What it is |
|---|---|
| `src/docs_rag/corpus.py` | Loads documents and chunks them by section and paragraph |
| `src/docs_rag/retriever.py` | BM25 index and search |
| `src/docs_rag/answer.py` | Prompt construction and the Claude call |
| `src/app.py` | Streamlit UI |
| `scripts/fetch_docs.py` | Downloads the public corpus |

## Possible next steps

Hybrid retrieval (BM25 plus embeddings), re-ranking, and an evaluation set of questions with expected source passages.
