"""Shared helpers for the live demos.

Nothing here is part of the RAG lesson itself. It exists so the demos read
well on camera: wide headers, aligned columns, and an on-disk embedding cache
so that rehearsing a demo twenty times costs money exactly once.
"""
import logging
import warnings

warnings.filterwarnings("ignore")

# CharacterTextSplitter logs one line per oversized chunk. That is expected
# behaviour (see demo 05) but it floods the screen, so we count them in the
# demo instead of letting the logger print thirty lines on camera.
logging.getLogger("langchain_text_splitters.base").setLevel(logging.ERROR)

import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.embeddings import Embeddings

ROOT = Path(__file__).resolve().parent

# Run everything from demo/ so that document metadata reads "docs/tesla.txt"
# exactly as the lesson shows, no matter where you launched the script from.
os.chdir(ROOT)

DOCS_PATH = "docs"
DB_PATH = "db_chroma"
CACHE_PATH = ROOT / ".embedding_cache"

load_dotenv(ROOT / ".env")

WIDTH = 78

# --- presentation output -----------------------------------------------


def title(step, text):
    """Big banner so the audience can see which demo is running."""
    print()
    print("━" * WIDTH)
    print(f"  DEMO {step}  ·  {text}")
    print("━" * WIDTH)


def section(text):
    print(f"\n── {text} " + "─" * max(0, WIDTH - len(text) - 4))


def note(text):
    print(f"     {text}")


def bar(value, lo, hi, width=34, fill="█"):
    """A horizontal bar, scaled between lo and hi."""
    span = hi - lo or 1
    n = int(round((value - lo) / span * width))
    return fill * max(0, min(width, n))


def _friendly_excepthook(exc_type, exc, tb):
    """Turn the errors that actually happen into one readable line.

    A traceback on a recording is noise at best and alarming at worst, and
    every failure mode here has a known cause. Anything unexpected still
    prints its full traceback - hiding a real bug would be worse.
    """
    import traceback

    name = exc_type.__name__
    msg = str(exc).lower()
    known = None

    if exc_type is KeyboardInterrupt:
        print("\n  stopped.\n")
        raise SystemExit(130)
    if "api_key" in msg or "authentication" in name.lower() or "401" in msg:
        known = ("OpenAI rejected the key.",
                 "Check OPENAI_API_KEY in demo/.env, then run ./run.sh check")
    elif "quota" in msg or "billing" in msg or "insufficient" in msg:
        known = ("The key is valid but the account has no credit.",
                 "Add funds at platform.openai.com -> Billing. "
                 "This is not a rate limit, despite the error name.")
    elif "rate limit" in msg or name == "RateLimitError":
        known = ("OpenAI is rate limiting this key.",
                 "Wait a moment and re-run. Cached embeddings mean a re-run "
                 "only retries what failed.")
    elif any(w in msg for w in ("connection", "timeout", "network", "getaddrinfo",
                                "temporarily unavailable")):
        known = ("Could not reach OpenAI.",
                 "Check your network. Demos 01, 04 and 05 need no network at all.")
    elif name == "FileNotFoundError" and "docs" in msg:
        known = ("The documents are missing.",
                 "Run: python3 tools/fetch_docs.py")

    print()
    if known:
        headline, fix = known
        print(f"  {headline}")
        print(f"  {fix}")
        print()
        raise SystemExit(1)

    traceback.print_exception(exc_type, exc, tb)


sys.excepthook = _friendly_excepthook


def require_key():
    if not os.environ.get("OPENAI_API_KEY"):
        print("\n  OPENAI_API_KEY is not set.")
        print("  Copy .env.example to .env and put your key in it, then re-run.")
        sys.exit(1)


# --- cached embeddings --------------------------------------------------


class CachedEmbeddings(Embeddings):
    """Real OpenAI embeddings, cached on disk by (model, dimensions, text).

    The vectors are genuine - this only avoids paying for the same string
    twice while you rehearse. Reports hits and misses, which doubles as a
    lesson about where the cost in a RAG pipeline actually sits.
    """

    def __init__(self, model="text-embedding-3-small", dimensions=None, quiet=False):
        from langchain_openai import OpenAIEmbeddings

        self.model = model
        self.dimensions = dimensions
        self.quiet = quiet
        kwargs = {"model": model}
        if dimensions:
            kwargs["dimensions"] = dimensions
        self._client = OpenAIEmbeddings(**kwargs)
        self.hits = 0
        self.misses = 0
        CACHE_PATH.mkdir(exist_ok=True)

    def _path(self, text):
        key = f"{self.model}:{self.dimensions}:{text}"
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
        return CACHE_PATH / f"{digest}.json"

    def embed_documents(self, texts):
        out = [None] * len(texts)
        todo, todo_idx = [], []
        for i, t in enumerate(texts):
            p = self._path(t)
            if p.exists():
                out[i] = json.loads(p.read_text())
                self.hits += 1
            else:
                todo.append(t)
                todo_idx.append(i)
        if todo:
            self.misses += len(todo)
            if not self.quiet:
                print(f"     calling OpenAI for {len(todo)} new chunk(s)"
                      f" ({self.hits} already cached) ...", flush=True)
            vectors = self._client.embed_documents(todo)
            for i, t, v in zip(todo_idx, todo, vectors):
                self._path(t).write_text(json.dumps(v))
                out[i] = v
        return out

    def embed_query(self, text):
        return self.embed_documents([text])[0]


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb)


def reset_db(path=None):
    path = path or DB_PATH
    if os.path.exists(path):
        shutil.rmtree(path)
        note(f"deleted existing {os.path.basename(path)}/ so counts stay honest")
