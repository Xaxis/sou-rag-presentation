"""DEMO 03 - Similar meaning gives similar numbers.
                                                (Lesson 01, section 05)

Nothing about embeddings matters as much as that sentence. This demo proves
it with real vectors: it embeds a set of words and measures how close every
pair actually is.
"""
import _demo  # noqa: F401  (sets up paths + quiet warnings)

from _demo import CachedEmbeddings, bar, cosine, note, require_key, section, title

require_key()
title("03", "Similar meaning gives similar numbers")

words = ["cat", "kitten", "dog", "elephant", "apple", "mango", "coffee", "tea"]

embedder = CachedEmbeddings(model="text-embedding-3-small")
vecs = dict(zip(words, embedder.embed_documents(words)))

section("Distance from 'cat' to everything else")
print()
scored = sorted(
    ((w, cosine(vecs["cat"], vecs[w])) for w in words if w != "cat"),
    key=lambda p: -p[1],
)
for w, s in scored:
    print(f"     cat  ->  {w:<10} {s:.3f}  {bar(s, 0.0, 1.0, 40)}")

top, top_score = scored[0]
last, last_score = scored[-1]
note("")
note(f"Closest to 'cat' is '{top}' at {top_score:.3f}. Furthest is '{last}' at {last_score:.3f}.")
note("The animals cluster, and the fruit and drinks fall away. That ordering")
note("came out of arithmetic on 1,536 numbers - nobody labelled any of it.")
note("")
note("Worth saying out loud: bare single words are a weak signal, and the")
note("ranking inside a cluster can surprise you. Real systems embed whole")
note("paragraphs, where there is far more meaning to go on.")

section("The full similarity grid")
print()
print("     " + " " * 10 + "".join(f"{w[:8]:>9}" for w in words))
for a in words:
    row = "".join(f"{cosine(vecs[a], vecs[b]):>9.2f}" for b in words)
    print(f"     {a:<10}" + row)

section("The neighbourhoods this produces")
groups = {
    "DOMESTIC ANIMALS": ["cat", "kitten", "dog"],
    "FRUIT": ["apple", "mango"],
    "DRINKS": ["coffee", "tea"],
}
print()
for name, members in groups.items():
    pairs = [(a, b) for i, a in enumerate(members) for b in members[i + 1:]]
    inside = sum(cosine(vecs[a], vecs[b]) for a, b in pairs) / max(1, len(pairs))
    outside_words = [w for w in words if w not in members]
    outside = sum(cosine(vecs[a], vecs[b]) for a in members for b in outside_words)
    outside /= (len(members) * len(outside_words))
    print(f"     {name:<18} inside {inside:.3f}   outside {outside:.3f}")

note("")
note("Every group is tighter inside than out. That is a neighbourhood.")
note("This drawing would have two dimensions. Real embeddings have 1,536.")
note("You cannot picture that, and you do not need to - the arithmetic of")
note("distance works identically no matter how many dimensions there are.")
print()
