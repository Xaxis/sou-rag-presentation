#!/usr/bin/env python3
"""Download the five source articles into demo/docs/ as plain text.

Run this once. It makes the corpus reproducible, so anyone who clones the
repo gets the same documents - and therefore roughly the same chunk counts
you will see on the slides.

    python3 tools/fetch_docs.py

Wikipedia's plain-text extract separates paragraphs with a single newline
and sections with three. The lesson's splitter uses separator="\\n\\n", so we
normalise every paragraph onto its own blank-line-separated block. Without
this the splitter finds almost no break points and produces 8,000 character
chunks, which are useless units of retrieval.
"""
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request

ARTICLES = {
    "google.txt": "Google",
    "microsoft.txt": "Microsoft",
    "nvidia.txt": "Nvidia",
    "spacex.txt": "SpaceX",
    "tesla.txt": "Tesla, Inc.",
}

OUT = pathlib.Path(__file__).resolve().parent.parent / "demo" / "docs"
API = "https://en.wikipedia.org/w/api.php"


def fetch(title):
    params = {
        "action": "query", "prop": "extracts", "explaintext": "1",
        "redirects": "1", "format": "json", "titles": title,
    }
    url = f"{API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "rag-lesson/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    page = next(iter(data["query"]["pages"].values()))
    return page.get("extract", "")


def normalise(text):
    """One paragraph per blank-line-separated block."""
    text = text.replace("\r\n", "\n")
    blocks = [re.sub(r"[ \t]+", " ", b).strip() for b in text.split("\n")]
    blocks = [b for b in blocks if b]
    return "\n\n".join(blocks) + "\n"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for filename, title in ARTICLES.items():
        raw = fetch(title)
        if not raw:
            print(f"  !! no extract returned for {title}", file=sys.stderr)
            continue
        text = normalise(raw)
        (OUT / filename).write_text(text, encoding="utf-8")
        paras = text.count("\n\n") + 1
        total += len(text)
        print(f"  {filename:<16} {len(text):>8,} characters   {paras:>5,} paragraphs")
    print(f"  {'TOTAL':<16} {total:>8,} characters")


if __name__ == "__main__":
    main()
