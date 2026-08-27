"""DEMO 06 - Step three, embed and store.       (Lesson 02, section 07)

Two conceptual steps, one line of code. Chroma.from_documents embeds every
chunk and writes the results to disk in a single call.

    python 06_embed_store.py            rebuild the store from scratch
    python 06_embed_store.py --append   demonstrate the re-run trap
"""
import _demo  # noqa: F401  (sets up paths + quiet warnings)

import sys
from pathlib import Path

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_text_splitters import CharacterTextSplitter

from _demo import (CachedEmbeddings, DB_PATH, DOCS_PATH, note, require_key,
                   reset_db, section, title)

require_key()
append = "--append" in sys.argv
title("06", "Embed every chunk and store it on disk")

documents = [
    Document(page_content=p.read_text(encoding="utf-8"),
             metadata={"source": f"{DOCS_PATH}/{p.name}"})
    for p in sorted(Path(DOCS_PATH).glob("*.txt"))
]
chunks = CharacterTextSplitter(
    chunk_size=800, chunk_overlap=100, separator="\n\n"
).split_documents(documents)
print(f"\n     {len(documents)} documents  ->  {len(chunks)} chunks ready to embed")

if append:
    section("Re-running WITHOUT clearing the store first")
    note("")
    note("from_documents ADDS to an existing collection. It does not replace it.")
else:
    section("Clearing any previous run")
    reset_db()
    note("While you are experimenting, delete db_chroma/ before each run.")


def create_vector_store(chunks, db_path):
    embeddings = CachedEmbeddings(model="text-embedding-3-small")

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=db_path,
        collection_metadata={"hnsw:space": "cosine"},
    )

    print(f"\n     Stored {len(chunks)} vectors in {db_path}/")
    print(f"     embedding calls: {embeddings.misses} new, {embeddings.hits} from cache")
    return vector_store


section("Chroma.from_documents( ) does both jobs")
store = create_vector_store(chunks, DB_PATH)

total = store._collection.count()
print(f"     the collection now holds {total:,} vectors")
if append and total > len(chunks):
    note("")
    note(f"You asked for {len(chunks)} and the collection holds {total:,}.")
    note("Half of those are duplicates, and you paid to embed them twice.")

section("What is stored per chunk")
peek = store._collection.get(limit=1, include=["documents", "metadatas", "embeddings"])
vec = peek["embeddings"][0]
print()
print(f"     the vector          {len(vec):,} numbers  "
      f"[{vec[0]:+.4f}, {vec[1]:+.4f}, {vec[2]:+.4f}, ...]")
print(f"     the original text   {peek['documents'][0][:58].strip()!r}...")
print(f"     the metadata        {peek['metadatas'][0]}")

note("")
note("The original text is not optional. Without it you have numbers and")
note("nothing to send an LLM.")

section("The three arguments that matter")
note("")
note("embedding            text-embedding-3-small, 1,536 dimensions.")
note("                     Write that down. Demo 07 must use exactly the same one.")
note("persist_directory    where the database lives on disk. Leave it out and")
note("                     Chroma runs in memory only - everything disappears")
note("                     when the script ends and you pay to embed again.")
note("hnsw:space cosine    the distance measure used to compare vectors.")
note("                     Cosine similarity is the standard choice for text.")
print()
