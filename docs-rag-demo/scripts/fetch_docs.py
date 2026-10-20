"""Download a handful of Python Enhancement Proposals (PEPs) into data/.

PEPs are public documents: each one is placed in the public domain or released
under CC0-1.0. Source: https://github.com/python/peps
"""

import json
import sys
import urllib.request
from pathlib import Path

PEPS = [1, 8, 20, 257, 343, 484, 498, 572]
RAW_URL = "https://raw.githubusercontent.com/python/peps/main/peps/pep-{n:04d}.rst"
PAGE_URL = "https://peps.python.org/pep-{n:04d}/"


def main() -> int:
    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(exist_ok=True)
    sources = {}
    for n in PEPS:
        name = f"pep-{n:04d}.rst"
        url = RAW_URL.format(n=n)
        try:
            with urllib.request.urlopen(url, timeout=20) as resp:
                (data_dir / name).write_bytes(resp.read())
        except OSError as exc:
            print(f"failed {url}: {exc}", file=sys.stderr)
            continue
        sources[name] = PAGE_URL.format(n=n)
        print(f"saved {name}")
    (data_dir / "sources.json").write_text(json.dumps(sources, indent=2) + "\n")
    return 0 if len(sources) == len(PEPS) else 1


if __name__ == "__main__":
    sys.exit(main())
