# Retrieval Augmented Generation — a work-along presentation

A 54-slide deck with **five interactive playgrounds**, eight runnable terminal
demos, and a word-for-word recording script — built from three source lessons:
**RAG theory**, **building the ingestion pipeline**, and the **RAG playground**.

Every number on a slide is the real output of a command in `demo/`. Nothing is
asserted and left hanging — if a slide claims two pieces of text have similar
embeddings, there is a script that measures it.

---

## The three pieces

| | |
|---|---|
| **`slides/index.html`** | The deck. Reveal.js, vendored — no network needed to present. |
| **`slides/interactive.js`** | The five in-slide playgrounds: sliders, query boxes, live re-chunking. |
| **`demo/`** | Eight numbered scripts, one per concept, plus the finished pipeline. |
| **`SCRIPT.md`** | Word-for-word narration for all 54 slides. ~77 minutes of speaking. |

---

## Setup

```bash
# 1. documents (five Wikipedia articles, normalised for the splitter)
python3 tools/fetch_docs.py

# 2. python environment
cd demo
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. your OpenAI key
cp .env.example .env              # then paste your key into .env
```

The API is prepaid and separate from any ChatGPT subscription. Embedding the
five documents costs **well under one cent**.

## Present

```bash
./present.sh                      # serves slides at http://localhost:8000
```

Press **S** in the deck for the speaker window — narration, timer, and a
preview of the next slide. That is the view to keep on your second monitor
while recording.

Keys: `→ / ←` navigate · `S` speaker view · `F` fullscreen · `O` overview ·
`B` blank the screen.

---

## The interactive slides

Five slides are live playgrounds you drive with the mouse during the talk. They
run entirely in the browser — no API key, no network.

| Slide | Widget | What you do on camera |
|---|---|---|
| 10 | **Corpus scale explorer** | Drag from 1 MB to 1 PB; watch tokens, embedding cost and "how many context windows" |
| 18 | **Neighbourhood map** | Click any word; similarity bars and a 2-D projection re-rank live |
| 38 | **Chunking playground** | Drag `chunk_size` and `chunk_overlap`; chunks re-cut, overlap highlighted |
| 44 | **Retrieval playground** | Type a question, move top *k*, watch the prompt assemble itself |
| 49 | **Mismatch toggle** | Flip the query model and watch retrieval break with zero errors raised |

**Two of them use real OpenAI vectors.** The neighbourhood map and the mismatch
toggle are driven by `slides/data.js`, precomputed by
`tools/export_slide_data.py` — genuine 1,536-dimension embeddings, not a
simulation. Regenerate with:

```bash
demo/venv/bin/python tools/export_slide_data.py
```

The chunking and retrieval playgrounds are pure browser code. Chunking is exact.
Retrieval scores with character-trigram vectors rather than neural embeddings so
the page needs no key — the *mechanism* is identical, and the slide says so out
loud. Demo 07 does the same thing with real embeddings.

---

## Demo order

Run them in order. `06` builds the database that `07` and `08` read.

| Demo | Command | Slide | Shows |
|---|---|---|---|
| 01 | `python 01_tokens.py` | 7, 9 | Tokens ≠ words; the corpus-vs-context-window scale gap |
| 02 | `python 02_embedding_shape.py` | 14 | Any length of text in, always 1,536 numbers out |
| 03 | `python 03_similar_meaning.py` | 16 | Similar meaning really does give similar numbers |
| 04 | `python 04_load.py` | 30–32 | `DirectoryLoader`, the `Document` object, metadata |
| 05 | `python 05_chunk.py` | 33–35 | Chunking, why 800 is a target, what overlap buys |
| 06 | `python 06_embed_store.py` | 36–38 | `Chroma.from_documents` embeds **and** stores |
| 07 | `python 07_query.py "Who founded SpaceX?"` | 39–40 | Retrieval, and the real prompt that reaches the LLM |
| 08 | `python 08_model_mismatch.py` | 44 | The silent failure: wrong model, no error, wrong chunks |

Two flags worth knowing on camera:

- `python 06_embed_store.py --append` — demonstrates the re-run trap (duplicate vectors).
- `python 07_query.py "..." --full` — prints the untruncated prompt.

### `ingestion_pipeline.py`

The finished sixty-line file the lesson builds toward — plain, no caching, no
flags. The numbered demos take these same steps apart one at a time; this is
the whole thing assembled.

---

## Notes on the build

**Embeddings are cached.** `demo/_demo.py` wraps `OpenAIEmbeddings` with an
on-disk cache keyed by model, dimensions and text. The vectors are genuine API
results — the cache only means rehearsing a demo twenty times costs money once.
`ingestion_pipeline.py` deliberately has no cache.

**The documents are normalised.** Wikipedia's plain-text export separates
paragraphs with a single newline; the lesson's splitter splits on blank lines.
`tools/fetch_docs.py` puts each paragraph in its own block. Skip that and
`CharacterTextSplitter` finds almost no break points and emits
8,000-character chunks.

**Where the numbers differ from the source lessons.** These are the real
outputs, so a few figures moved:

- The source says *"Retrieval augmented generation is powerful"* is 9 tokens.
  The real `cl100k_base` tokenizer gives **7**. Demo 01 prints the true count.
- The source gets **797** chunks; this corpus gives **539** at
  `chunk_overlap=0` and **547** at `100`. Article lengths differ. The source
  says to expect this.
- The source's embedding table implies *kitten* is closest to *cat*. Real
  embeddings put **dog** first. Demo 03 derives its commentary from the actual
  output and says why.

## Editing

Narration lives **only** in the `<aside class="notes">` blocks in
`slides/index.html`. After editing:

```bash
python3 tools/build_script.py     # regenerates SCRIPT.md
```

Never edit `SCRIPT.md` directly — it is generated.

Cues in the narration:

- `[RUN DEMO n]` — switch to the terminal and run that demo.
- `[CLICK ...]` / `[DRAG ...]` — drive the interactive widget on the current slide.
