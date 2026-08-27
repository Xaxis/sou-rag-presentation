"""DEMO 07 - Confirm it worked, and see the real prompt.
                                (Lesson 02 section 08, Lesson 01 section 08)

The store is built. Ask it a question. This is also where the single most
misread step in RAG becomes obvious: the vectors are used for finding, and
then they are thrown away.

    python 07_query.py
    python 07_query.py "What does Nvidia make?"
"""
import _demo  # noqa: F401  (sets up paths + quiet warnings)

import sys
import textwrap

from langchain_chroma import Chroma

from _demo import (CachedEmbeddings, DB_PATH, bar, note, require_key, section,
                   title)

require_key()
question = sys.argv[1] if len(sys.argv) > 1 else "Who founded SpaceX?"

title("07", "Ask the store a question")

import os
if not os.path.exists(DB_PATH):
    print(f"\n  {DB_PATH}/ does not exist yet. Run 06_embed_store.py first.\n")
    raise SystemExit(1)

# The same embedding model the documents were embedded with. Every time.
embeddings = CachedEmbeddings(model="text-embedding-3-small")
store = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)

print(f"\n     question   {question!r}")
print(f"     collection {store._collection.count():,} vectors")

section("Step 1 - the question becomes a vector")
qv = embeddings.embed_query(question)
print()
print(f"     [{qv[0]:+.4f}, {qv[1]:+.4f}, {qv[2]:+.4f}, ...]   {len(qv):,} numbers")
note("Same model, same dimensions as the documents. That is not optional.")

section("Step 2 - every stored vector is scored by closeness, top k returned")
results = store.similarity_search_with_relevance_scores(question, k=5)
print()
for doc, score in results:
    src = doc.metadata["source"].replace("docs/", "")
    body = " ".join(doc.page_content.split())[:52]
    print(f"     {score:.3f} {bar(score, 0.0, 1.0, 22)} {src:<14} {body}...")

note("")
note("You choose how many come back. That number is top k. Ask for 5 and you")
note("get 5, whether or not all 5 are any good.")

section("Step 3 - what actually reaches the LLM")
top = results[:3]
full = "--full" in sys.argv


def for_display(text):
    """Keep the prompt on one screen unless --full is passed."""
    text = text.strip()
    if full or len(text) <= 300:
        return text
    return text[:300].rstrip() + f"  [... {len(text) - 300} more characters]"


context = "\n\n".join(for_display(d.page_content) for d, _ in top)
real_context = "\n\n".join(d.page_content.strip() for d, _ in top)
prompt = (
    "Answer the question using only the context below.\n\n"
    f"CONTEXT:\n{context}\n\n"
    f"QUESTION: {question}\n"
)
print()
for line in prompt.splitlines():
    for wrapped in (textwrap.wrap(line, 92) or [""]):
        print(f"     │ {wrapped}")

print()
real_len = len(prompt) - len(context) + len(real_context)
print(f"     prompt length: {real_len:,} characters, "
      f"built from the top {len(top)} chunks"
      + ("" if full else "   (shown trimmed - pass --full to see it all)"))
note("")
note("SENT: the question, plus the ORIGINAL ENGLISH TEXT of the top chunks.")
note("NOT SENT: the vectors. Their job finished the moment the matching was done.")
note("")
note("This is the step everyone misreads. After retrieval you are back in")
note("plain English. Nothing numeric is in the prompt at all.")

section("Sources you could cite")
print()
for doc, score in top:
    print(f"     {doc.metadata['source']}   (score {score:.3f})")
note("")
note("That is the metadata surviving all the way from the loader, through")
note("chunking, into the answer.")
print()
