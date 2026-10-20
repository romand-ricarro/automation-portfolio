"""Streamlit UI. Run from the project root: streamlit run src/app.py"""

import os
from pathlib import Path

import anthropic
import streamlit as st
from dotenv import load_dotenv

from docs_rag.answer import generate_answer
from docs_rag.corpus import chunk_document, load_documents
from docs_rag.retriever import BM25Index

load_dotenv()
DATA_DIR = Path(os.getenv("DOCS_DIR", Path(__file__).parent.parent / "data"))

st.set_page_config(page_title="Docs Q&A", page_icon="📚")


@st.cache_resource
def build_index(folder: str) -> tuple[BM25Index, int]:
    docs = load_documents(Path(folder))
    chunks = [c for d in docs for c in chunk_document(d)]
    return BM25Index(chunks), len(docs)


st.title("📚 Ask the docs")
st.caption("Retrieval-augmented Q&A over public documents (Python Enhancement Proposals by default).")

index, doc_count = build_index(str(DATA_DIR))
if doc_count == 0:
    st.warning(f"No documents in `{DATA_DIR}`. Run `python scripts/fetch_docs.py` first.")
    st.stop()

has_key = bool(os.getenv("ANTHROPIC_API_KEY"))
with st.sidebar:
    st.metric("Documents", doc_count)
    st.metric("Chunks", len(index.chunks))
    top_k = st.slider("Passages to retrieve", 1, 8, 4)
    use_llm = st.toggle("Generate answer with Claude", value=has_key, disabled=not has_key,
                        help=None if has_key else "Set ANTHROPIC_API_KEY to enable.")

question = st.text_input("Question", placeholder="How long should lines be in Python code?")
if question:
    hits = index.search(question, k=top_k)
    if not hits:
        st.info("No matching passages. Try different keywords.")
    elif use_llm:
        with st.spinner("Asking Claude..."):
            try:
                st.markdown(generate_answer(question, hits).text)
            except anthropic.APIError as exc:
                st.error(f"API call failed ({type(exc).__name__}). The retrieved passages are below.")

    for i, hit in enumerate(hits, 1):
        label = f"[{i}] {hit.chunk.doc_title} - {hit.chunk.section}  (score {hit.score:.2f})"
        with st.expander(label, expanded=not use_llm and i == 1):
            st.text(hit.chunk.text)
            if hit.chunk.url:
                st.markdown(f"Source: {hit.chunk.url}")
