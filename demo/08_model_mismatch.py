"""DEMO 08 - The mistake that breaks most first builds.
                                                (Lesson 01, section 09)

Use the same embedding model and the same dimension count for your documents
and for your queries. Every time. No exceptions.

This demo breaks that rule on purpose and shows you what it looks like:
nothing crashes, no error is printed, and the answers are quietly wrong.
"""
import _demo  # noqa: F401  (sets up paths + quiet warnings)

from langchain_chroma import Chroma
from langchain_core.documents import Document

from _demo import (CachedEmbeddings, ROOT, note, require_key, reset_db,
                   section, title)

require_key()
title("08", "One embedding model, everywhere - or it fails silently")

FACTS = [
    "Refunds are issued within 30 days of purchase.",
    "Q1 revenue reached 4.2 million dollars.",
    "Guest wifi resets every Monday morning.",
    "The office is closed on public holidays.",
    "Parking permits are renewed each January.",
    "Expense claims must be filed within 60 days.",
]
docs = [Document(page_content=t, metadata={"id": i}) for i, t in enumerate(FACTS)]
QUESTION = "What were our sales in the first quarter?"
CORRECT = "Q1 revenue reached 4.2 million dollars."

DB = str(ROOT / "db_mismatch")
reset_db(DB)

# Documents are embedded ONCE, with text-embedding-3-small at 1,536 dims.
section("Documents embedded in January: text-embedding-3-small, 1,536 dims")
january = CachedEmbeddings(model="text-embedding-3-small", quiet=True)
store = Chroma.from_documents(
    documents=docs, embedding=january, persist_directory=DB,
    collection_metadata={"hnsw:space": "cosine"},
)
print(f"\n     stored {len(docs)} facts")

print(f"\n     question: {QUESTION!r}")


def ask(label, embedder):
    """Query the SAME store using whatever embedder is passed in."""
    store = Chroma(persist_directory=DB, embedding_function=embedder)
    hits = store.similarity_search_with_relevance_scores(QUESTION, k=3)
    print(f"\n     {label}")
    for doc, score in hits:
        mark = "  <-- correct" if doc.page_content == CORRECT else ""
        print(f"       {score:>6.3f}  {doc.page_content:<48}{mark}")
    return hits[0][0].page_content


section("Queries embedded in March with THE SAME model")
right = ask("text-embedding-3-small, 1,536 dims", january)

section("Queries embedded in March with A DIFFERENT model, same dimensions")
note("")
note("text-embedding-3-large asked for 1,536 dimensions, so the vector is")
note("the same SHAPE. Chroma has no way to know it is a different language.")
march = CachedEmbeddings(model="text-embedding-3-large", dimensions=1536, quiet=True)
wrong = ask("text-embedding-3-large, 1,536 dims", march)

section("The verdict")
print()
print(f"     same model      top hit -> {right!r}")
print(f"     different model top hit -> {wrong!r}")
print()
if wrong == CORRECT:
    note("On this tiny six-fact set the wrong model still happened to land on")
    note("the right answer - but look at the scores above. They collapsed.")
    note("Across hundreds of chunks that margin is where the errors live.")
else:
    note("The wrong model returned the WRONG chunk as its best match.")

note("")
note("Notice what did NOT happen:")
note("  - nothing crashed")
note("  - no error message was printed")
note("  - the retriever returned chunks and looked perfectly healthy")
note("")
note("An LLM handed those chunks writes a confident, wrong answer.")
note("Think of embedding models as separate languages. A vector written by")
note("one model means nothing to another, and neither one will tell you.")

from _demo import DB_PATH
import os

if not os.path.exists(DB_PATH):
    note("")
    note(f"Skipping the real-corpus comparison: {DB_PATH}/ does not exist yet.")
    note("Run 06_embed_store.py first to build it.")
    print()
    raise SystemExit(0)

section("Now the same mistake on the real 547-chunk store")
real_q = "Who founded SpaceX?"


def top_sources(embedder):
    st = Chroma(persist_directory=DB_PATH, embedding_function=embedder)
    hits = st.similarity_search_with_relevance_scores(real_q, k=3)
    return [(d.metadata["source"].replace("docs/", ""), s,
             " ".join(d.page_content.split())[:44]) for d, s in hits]


print(f"\n     question: {real_q!r}   (answer lives in spacex.txt)")
for label, emb in (
    ("RIGHT model  text-embedding-3-small", january),
    ("WRONG model  text-embedding-3-large@1536", march),
):
    print(f"\n     {label}")
    for src, sc, body in top_sources(emb):
        flag = "" if src == "spacex.txt" else "   <-- WRONG FILE"
        print(f"       {sc:>6.3f}  {src:<14} {body}...{flag}")

note("")
note("Same store, same question, same number of results. Only the model that")
note("embedded the QUESTION changed - and the retriever walked off into the")
note("wrong documents entirely, without a single warning.")

section("What this means in practice")
note("")
note("  - Choose your embedding model before you ingest a single document.")
note("  - Choose your dimension count at the same time and write it down.")
note("  - If you switch model later, you re-embed the entire corpus.")
note("  - There is no partial migration. Changing dimensions breaks it too.")
print()
