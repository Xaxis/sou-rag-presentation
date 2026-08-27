"""DEMO 05 - Step two, chunk them.              (Lesson 02, section 06)

Whole articles are useless units of retrieval. Nobody wants an entire
Wikipedia article back because one sentence in it matched. This demo cuts
them up, and then shows exactly what chunk_overlap buys you.
"""
import _demo  # noqa: F401  (sets up paths + quiet warnings)

import os
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import CharacterTextSplitter

from _demo import DOCS_PATH, note, section, title

title("05", "Chunk the documents")

documents = [
    Document(page_content=p.read_text(encoding="utf-8"),
             metadata={"source": f"{DOCS_PATH}/{p.name}"})
    for p in sorted(Path(DOCS_PATH).glob("*.txt"))
]


def split_documents(documents, chunk_size=800, chunk_overlap=0, show=True):
    splitter = CharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separator="\n\n",         # prefer to break at paragraph boundaries
    )
    chunks = splitter.split_documents(documents)
    if show:
        print(f"\nSplit {len(documents)} documents into {len(chunks)} chunks")
        for chunk in chunks[:3]:
            src = os.path.basename(chunk.metadata["source"])
            body = " ".join(chunk.page_content.split())[:64]
            print(f"  {src:<16} | {body}...")
    return chunks


section("chunk_size=800, chunk_overlap=0")
zero = split_documents(documents, 800, 0)

sizes = [len(c.page_content) for c in zero]
print()
print(f"     chunks          {len(zero):,}")
print(f"     smallest        {min(sizes):,} characters")
print(f"     largest         {max(sizes):,} characters")
print(f"     average         {sum(sizes) // len(sizes):,} characters")

note("")
note("The unit is CHARACTERS, not tokens. 800 characters is roughly 200 tokens.")
note("Different splitters count differently, so always check which unit you are in.")

section("Why the chunks are not all exactly 800")
oversize = [c for c in zero if len(c.page_content) > 800]
print()
print(f"     {len(oversize)} of {len(zero)} chunks came out longer than the 800 target")
if oversize:
    biggest = max(oversize, key=lambda c: len(c.page_content))
    print(f"     the biggest is {len(biggest.page_content):,} characters")
note("")
note("LangChain logs a warning for each of those. It is a warning, not an error.")
note("CharacterTextSplitter splits on the separator first, then merges pieces up")
note("to chunk_size. It never breaks a paragraph in half to hit the number, so")
note("chunk_size is a target, not a hard cap.")
note("")
note("RecursiveCharacterTextSplitter handles this better and is what you would")
note("use in a real project. We stay on the simple one so the mechanics show.")

section("What chunk_overlap actually does")

# Shown on a short passage with a small chunk_size, so the cut is visible on
# one screen. The mechanism is identical at 800 characters.
passage = (
    "Tesla was incorporated in July 2003 by Martin Eberhard and Marc "
    "Tarpenning as Tesla Motors. Its name is a tribute to the inventor "
    "Nikola Tesla. In February 2004 Elon Musk led Tesla's first funding round."
)

def show(overlap):
    sp = CharacterTextSplitter(
        chunk_size=120, chunk_overlap=overlap, separator=" "
    )
    parts = sp.split_text(passage)
    print(f"\n     chunk_overlap = {overlap}")
    for i, c in enumerate(parts):
        print(f"       [{i}] {c}")
    return parts

zero_parts = show(0)
note("")
note("Read the seam between [0] and [1]. A sentence is cut clean in half:")
note(f"  [0] trails off with  ...{zero_parts[0][-34:]!r}")
note(f"  [1] picks it up with {zero_parts[1][:34]!r}...")
note("Neither half carries the whole fact, so neither half is a good match")
note("for a question about it. That is the failure overlap prevents.")

over_parts = show(40)
shared = ""
if len(over_parts) > 1:
    tail = zero_parts[0][-40:]
    for n in range(min(len(zero_parts[0]), len(over_parts[1])), 0, -1):
        if over_parts[1].startswith(zero_parts[0][-n:]):
            shared = zero_parts[0][-n:]
            break
note("")
if shared:
    note(f"Chunk [1] now begins by repeating the tail of chunk [0]:")
    note(f"  \"{shared}\"")
note("The sentence on the seam survives intact inside one chunk.")

section("chunk_size=800, chunk_overlap=100")
hundred = split_documents(documents, 800, 100, show=False)
print()
print(f"     chunks with overlap=0     {len(zero):,}")
print(f"     chunks with overlap=100   {len(hundred):,}")
note("")
note("Each chunk now repeats the tail of the one before it, so sentences on")
note("the seam survive intact in at least one chunk.")
note("")
note("Rule of thumb: set overlap to 10 to 20 percent of chunk size. For 800")
note("characters, 100 is a reasonable default. You pay for the duplication in")
note("storage and embedding cost, and it is almost always worth it.")
print()
