"""BM25 keyword retrieval. No embeddings or API key needed, so the demo runs offline."""

import math
import re
from collections import Counter
from dataclasses import dataclass

from .corpus import Chunk

TOKEN = re.compile(r"[a-z0-9_]+")
STOPWORDS = frozenset(
    "a an and are as at be by can do does for from has have how i in is it its of on or should "
    "that the this to was what when where which who why will with you your".split()
)


def tokenize(text: str) -> list[str]:
    return [t for t in TOKEN.findall(text.lower()) if t not in STOPWORDS]


@dataclass(frozen=True)
class Hit:
    chunk: Chunk
    score: float


class BM25Index:
    def __init__(self, chunks: list[Chunk], k1: float = 1.5, b: float = 0.75):
        self.chunks = chunks
        self.k1, self.b = k1, b
        # Section headings are indexed with the text, since they often name the topic.
        self._tfs = [Counter(tokenize(f"{c.section} {c.text}")) for c in chunks]
        self._lengths = [sum(tf.values()) for tf in self._tfs]
        self._avg_len = sum(self._lengths) / len(chunks) if chunks else 0.0
        df = Counter(term for tf in self._tfs for term in tf)
        n = len(chunks)
        self._idf = {term: math.log(1 + (n - d + 0.5) / (d + 0.5)) for term, d in df.items()}

    def search(self, query: str, k: int = 4) -> list[Hit]:
        terms = tokenize(query)
        scored = []
        for chunk, tf, length in zip(self.chunks, self._tfs, self._lengths):
            score = 0.0
            for term in terms:
                f = tf.get(term)
                if not f:
                    continue
                norm = self.k1 * (1 - self.b + self.b * length / self._avg_len)
                score += self._idf[term] * f * (self.k1 + 1) / (f + norm)
            if score > 0:
                scored.append(Hit(chunk, score))
        scored.sort(key=lambda h: h.score, reverse=True)
        return scored[:k]
