"""Loading documents and splitting them into retrievable chunks."""

import json
import re
from dataclasses import dataclass
from pathlib import Path

HEADING_UNDERLINE = re.compile(r"^([=\-~^\"'`#*+])\1{2,}\s*$")
MARKDOWN_HEADING = re.compile(r"^#{1,6}\s+(.*)$")
RST_FIELD = re.compile(r"^([A-Z][A-Za-z-]+):\s*(.*)$")


@dataclass(frozen=True)
class Document:
    doc_id: str
    title: str
    text: str
    url: str | None = None


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    doc_id: str
    doc_title: str
    section: str
    text: str
    url: str | None = None


def load_documents(folder: Path) -> list[Document]:
    """Load every .rst / .md / .txt file in a folder. Optional sources.json maps file name -> URL."""
    sources_file = folder / "sources.json"
    sources = json.loads(sources_file.read_text()) if sources_file.exists() else {}
    docs = []
    for path in sorted(folder.iterdir()):
        if path.suffix not in {".rst", ".md", ".txt"}:
            continue
        text = path.read_text(encoding="utf-8")
        docs.append(Document(path.stem, _title(text, path.stem), text, sources.get(path.name)))
    return docs


def _title(text: str, fallback: str) -> str:
    for line in text.splitlines()[:30]:
        field = RST_FIELD.match(line)
        if field and field.group(1) == "Title":
            return field.group(2).strip()
        heading = MARKDOWN_HEADING.match(line)
        if heading:
            return heading.group(1).strip()
    return fallback


def chunk_document(doc: Document, max_chars: int = 1200) -> list[Chunk]:
    """Split a document into chunks of whole paragraphs, each tagged with its section heading."""
    lines = doc.text.splitlines()
    section = doc.title
    paragraphs: list[tuple[str, str]] = []  # (section, paragraph)
    buffer: list[str] = []

    def flush() -> None:
        if buffer:
            paragraph = "\n".join(buffer).strip()
            if paragraph:
                paragraphs.append((section, paragraph))
            buffer.clear()

    i = 0
    while i < len(lines):
        line = lines[i]
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        md = MARKDOWN_HEADING.match(line)
        if md:
            flush()
            section = md.group(1).strip()
        elif line.strip() and HEADING_UNDERLINE.match(nxt) and len(nxt.strip()) >= len(line.strip()):
            flush()
            section = line.strip()
            i += 1  # skip the underline
        elif HEADING_UNDERLINE.match(line):
            pass  # overline of an RST title
        elif not line.strip():
            flush()
        else:
            buffer.append(line)
        i += 1
    flush()

    chunks: list[Chunk] = []
    current: list[str] = []
    current_section = None

    def emit() -> None:
        if current:
            chunks.append(Chunk(f"{doc.doc_id}#{len(chunks)}", doc.doc_id, doc.title,
                                current_section or doc.title, "\n\n".join(current), doc.url))
            current.clear()

    for sec, paragraph in paragraphs:
        size = sum(len(p) for p in current)
        if current and (sec != current_section or size + len(paragraph) > max_chars):
            emit()
        current_section = sec
        current.append(paragraph)
    emit()
    return chunks
