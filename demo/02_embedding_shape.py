"""DEMO 02 - The embedding model returns a fixed length vector.
                                                (Lesson 01, section 04)

An embedding model is not an LLM. It does not generate text. Text goes in,
a list of numbers comes out - and the list is always the same length no
matter how much text you gave it. That is the property the whole system
is built on.
"""
import _demo  # noqa: F401  (sets up paths + quiet warnings)

from _demo import CachedEmbeddings, note, require_key, section, title

require_key()
title("02", "Text in, a fixed length vector out")

embedder = CachedEmbeddings(model="text-embedding-3-small")

samples = [
    ("one word",        "Refunds"),
    ("one sentence",    "Refunds are issued within 30 days of purchase."),
    ("a paragraph",     "Refunds are issued within 30 days of purchase. To start a "
                        "return, open the orders page, choose the item, and select "
                        "return. Shipping costs are refunded only when the item "
                        "arrived damaged or the wrong item was sent. Refunds land "
                        "on the original payment method and take three to five "
                        "working days to appear on a statement." * 6),
]

section("Same model, wildly different inputs")
print()
vectors = []
for label, text in samples:
    v = embedder.embed_documents([text])[0]
    vectors.append(v)
    print(f"     {label:<14} {len(text.split()):>4} words in   ->  {len(v):>5} numbers out")

section("The first eight numbers of the sentence vector")
print()
print("     [ " + "  ".join(f"{x:+.4f}" for x in vectors[1][:8]) + "  ... ]")
note("")
note(f"That vector has {len(vectors[1]):,} numbers in total. We are looking at 8.")

section("Why fixed length matters")
note("")
note("One word in or nine hundred words in, the vector is the same size.")
note("Because every chunk becomes a list of the same length, any two chunks")
note("can be compared with simple arithmetic. That is the entire trick.")
print()
