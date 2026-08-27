"""DEMO 01 - Tokens and the context window.   (Lesson 01, section 02)

Shows that a model reads tokens, not words, and then shows why a very large
context window still does not let you paste your whole company into a prompt.
"""
import _demo  # noqa: F401  (sets up paths + quiet warnings)

import tiktoken

from _demo import DOCS_PATH, bar, note, section, title
from pathlib import Path

title("01", "Tokens and the context window")

# --- 1. words are not tokens -------------------------------------------
section("What you wrote, and what the model counts")

sentence = "Retrieval augmented generation is powerful"
enc = tiktoken.get_encoding("cl100k_base")
ids = enc.encode(sentence)
pieces = [enc.decode([i]).replace(" ", "_") for i in ids]

print(f"\n     text     : {sentence!r}")
print(f"     words    : {len(sentence.split())}")
print(f"     tokens   : {len(ids)}")
print(f"     split as : {' | '.join(pieces)}")
note("")
note("One token is roughly three quarters of an English word.")
note("Common words are one token. Rare or long words split into several.")
note("Spaces usually travel with the token that follows them.")

# --- 2. the real corpus -------------------------------------------------
section("How big is the corpus we are about to ingest?")

total_chars = 0
print()
for f in sorted(Path(DOCS_PATH).glob("*.txt")):
    n = len(f.read_text(encoding="utf-8"))
    total_chars += n
    print(f"     {f.name:<16} {n:>9,} characters")

total_tokens = len(enc.encode(
    "\n".join(p.read_text(encoding="utf-8") for p in sorted(Path(DOCS_PATH).glob("*.txt")))
))
print(f"     {'TOTAL':<16} {total_chars:>9,} characters  =  {total_tokens:,} tokens")

# --- 3. the scale gap ---------------------------------------------------
section("How much text, in tokens - logarithmic scale")

scales = [
    ("One chunk",                        1_000),
    ("These 5 articles",                 total_tokens),
    ("A frontier model window",          1_000_000),
    ("The largest advertised",           10_000_000),
    ("A mid sized company, 1 TB",        250_000_000_000),
    ("An enterprise archive, 1 PB",      250_000_000_000_000),
]
import math
lo, hi = 2.0, math.log10(250_000_000_000_000)
print()
for label, n in scales:
    lg = math.log10(n)
    print(f"     {label:<28} {bar(lg, lo, hi):<34} {n:>19,}")

note("")
note("Each step right is ten times larger, not one step larger.")
note("Everything below the model window lines does not fit in a prompt.")
note("That gap is not closed by waiting for bigger models.")
note("")
note("And you pay per token. Sending 500,000 tokens of irrelevant context")
note("to answer one question is expensive, slow, and gives worse answers")
note("than sending the five right paragraphs.")
print()
