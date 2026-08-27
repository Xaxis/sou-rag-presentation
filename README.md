# Build a RAG system, one piece at a time

**[ragverse.diy](https://ragverse.diy)** — slides, five interactive playgrounds,
and eight demos you run yourself.

A deck teaches Retrieval Augmented Generation; this repo is the code that goes
with it. You end up with a working ingestion pipeline: five documents in, a
searchable vector database out, in about sixty lines of Python.

It comes in **four editions** — long or short, and work-along or talk-only:

| | Work-along (you run the demos) | Talk only (no terminal) |
|---|---|---|
| **Full** · 54 slides | [~78 min](https://ragverse.diy/read/) | [~78 min](https://ragverse.diy/read/talk/) |
| **Short** · 33 slides | [~45 min](https://ragverse.diy/read/short/) | [~45 min](https://ragverse.diy/read/talk-short/) |

Same slides, same output, same rigour — what changes is the narration and how
much of it there is. The talk editions explain output that is already on the
slide, so there is nothing to set up and nothing that can fail on camera.

Every number in the lesson is real output from these scripts. Nothing is an
illustration.

---

## Start here

```bash
./run.sh setup      # one time: venv, packages, documents        (~30 seconds)
./run.sh check      # confirms your API key actually works
./run.sh follow     # the eight demos, in order, with pauses
```

That is the whole thing. `follow` tells you which slide each demo belongs to
and waits for you between them.

Want the slides on screen at the same time? In a second terminal:

```bash
./run.sh slides     # opens the deck at localhost:8000
```

### You will need

- **Python 3.10+** and a terminal.
- **An OpenAI API key.** Put it in `demo/.env` — `setup` creates that file for
  you from `.env.example`. Get one at
  [platform.openai.com](https://platform.openai.com) → Settings → API keys.
- **About one cent.** The API is prepaid and separate from any ChatGPT
  subscription; the minimum top-up is around $5 and will last you months.

---

## What you build

<!-- BEGIN:demo-table -->
| Demo | Slide | Command | What it shows |
|---|---|---|---|
| 01 | **7** | `python 01_tokens.py` | Tokens are not words; the corpus-vs-context-window scale gap |
| 02 | **15** | `python 02_embedding_shape.py` | Any length of text in, always 1,536 numbers out |
| 03 | **17** | `python 03_similar_meaning.py` | Similar meaning really does give similar numbers |
| 04 | **32** | `python 04_load.py` | Reading files into `Document` objects, and metadata |
| 05 | **35** | `python 05_chunk.py` | Chunking, why 800 is a target, what overlap buys you |
| 06 | **39, 45** | `python 06_embed_store.py` | `Chroma.from_documents` embeds **and** stores |
| 07 | **42** | `python 07_query.py "Who founded SpaceX?"` | Retrieval, and the real prompt that reaches the LLM |
| 08 | **48** | `python 08_model_mismatch.py` | The silent failure: wrong model, no error, wrong chunks |
| — | **30** | `python3 tools/fetch_docs.py` | Downloads and normalises the five source articles |
<!-- END:demo-table -->

Run any one on its own with `./run.sh demo 5`, or all of them with
`./run.sh demo all`. **All eight are in both edits** — only the slides differ,
so the terminal half of the session is identical either way.

Two flags worth knowing:

- `./run.sh demo 6 --append` — shows the re-run trap, where you end up with
  duplicate vectors and pay to embed everything twice.
- `./run.sh demo 7 "your question here"` — ask the store anything.

### The finished file

`demo/ingestion_pipeline.py` is the whole pipeline assembled — plain, no
caching, no flags. The eight numbered demos take those same steps apart one at
a time so you can see each one work.

---

## The interactive playgrounds

Five slides are live playgrounds. They run in your browser with no API key, so
you can also use them straight from [ragverse.diy/play](https://ragverse.diy/play/).

<!-- BEGIN:ix-table -->
| Slide | Widget | What you do on camera |
|---|---|---|
| **10** | Corpus scale explorer | Drag 1 MB to 1 PB; watch tokens, embedding cost and context windows needed |
| **18** | Neighbourhood map | Click any word; similarity bars and a 2-D projection re-rank live |
| **38** | Chunking playground | Drag `chunk_size` and `chunk_overlap`; chunks re-cut, overlap highlighted |
| **44** | Retrieval playground | Type a question, move top *k*, watch the prompt assemble itself |
| **49** | Mismatch toggle | Flip the query model and watch retrieval break with zero errors raised |
<!-- END:ix-table -->

Two of them use real precomputed OpenAI vectors rather than a simulation. The
chunking playground is exact. The retrieval playground scores with
character-trigram vectors so it needs no key — the mechanism is identical, and
the slide says so rather than pretending otherwise.

---

## When it does not work

| What you see | What it means |
|---|---|
| `OpenAIError: api_key must be set` | No key in `demo/.env`, or the name is not exactly `OPENAI_API_KEY`. |
| `RateLimitError: quota exceeded` | The key is fine; the account has no credit. **This is not a rate limit.** |
| `ModuleNotFoundError` | Run `./run.sh setup` again. |
| `No .txt files found` | Run `python3 tools/fetch_docs.py`. |
| `Created a chunk of size N, longer than 800` | A warning, not an error. Expected — see slide 36. |

`./run.sh check` catches most of these before you start, including a key that
is still the placeholder or an account with no credit.

Starting over: `./run.sh clean` deletes the vector store so demo 06 rebuilds
from scratch.

---

## What is in here

```
run.sh                     everything goes through this
demo/                      the eight demos + ingestion_pipeline.py
demo/docs/                 the five source articles
slides/                    the deck (reveal.js, vendored - works offline)
SCRIPT.md                  word-for-word narration for all 54 slides
tools/                     regenerate the docs, corpus, and site
```

Presenting or editing it yourself? See **[docs/MAINTAINING.md](docs/MAINTAINING.md)**.
