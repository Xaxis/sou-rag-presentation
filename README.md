# Build a RAG system, one piece at a time

**[ragverse.diy](https://ragverse.diy)** — slides, five interactive playgrounds,
and eight demos you run yourself.

A deck teaches Retrieval Augmented Generation; this repo is the code that goes
with it. You end up with a working ingestion pipeline: five documents in, a
searchable vector database out, in about sixty lines of Python.

It comes in **six editions** — three lengths, each as a talk or a work-along.
For a recorded video, **essentials as a talk** or **short as a talk** are the
most effective. Both keep every demo and the whole argument; short adds the
gotchas, the API key and the practical rules.

<!-- BEGIN:editions -->
| | Talk only (no terminal) | Work-along (you run the demos) |
|---|---|---|
| **Essentials** · 28 slides | [~23 min](https://ragverse.diy/read/talk-essentials/) | [~37 min](https://ragverse.diy/read/essentials/) |
| **Short** · 36 slides | [~30 min](https://ragverse.diy/read/talk-short/) | [~44 min](https://ragverse.diy/read/short/) |
| **Full** · 54 slides | [~83 min](https://ragverse.diy/read/talk/) | [~105 min](https://ragverse.diy/read/) |
<!-- END:editions -->

Same slides, same output, same rigour. **Neither short nor essentials is a
summary** — both run on tightened narration rather than fewer ideas, and both
carry all eight demos and every vocabulary term. Only the full edition keeps
the unhurried, conversational phrasing, which is what makes it long.

The **talk** editions explain output that is already on the slide, so there is
nothing to set up and nothing that can fail on camera. The **work-along**
editions cue you to run each demo yourself.

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
- **Well under a cent.** The API is prepaid and separate from any ChatGPT
  subscription; the minimum top-up is around $5 and will last you months.

---

## What you build

Slide numbers below are the full edition; `./run.sh follow` names each slide by
title instead, so it is right whichever edition you have on screen.

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
`./run.sh demo all`. **All eight are in all three editions** — only the slides
differ, so the terminal half of the session is identical whichever you pick.

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

Three of them use real precomputed OpenAI vectors rather than a simulation:
the neighbourhood map, the retrieval playground's four preset questions, and
the mismatch toggle. The chunking playground is exact browser code. Only a
question you type yourself falls back to a rough local measure — embedding it
would need an API call — and the panel says which one you are looking at.

---

## When it does not work

| What you see | What it means |
|---|---|
| `OpenAIError: api_key must be set` | No key in `demo/.env`, or the name is not exactly `OPENAI_API_KEY`. |
| `RateLimitError: quota exceeded` | The key is fine; the account has no credit. **This is not a rate limit.** |
| `ModuleNotFoundError` | Run `./run.sh setup` again. |
| `No .txt files found` | Run `python3 tools/fetch_docs.py`. |
| `Created a chunk of size N, longer than 800` | A warning, not an error. Expected — see *800 is a target, not a cap*. |

`./run.sh check` catches most of these before you start, including a key that
is still the placeholder or an account with no credit. If something does fail
mid-run you get one plain line explaining it, not a traceback.

**Rehearse once and the recording cannot fail on network.** Embeddings are
cached on disk by model, dimensions and text, so a second run of any demo you
have already done makes no API calls at all — it works with the wifi off.

Starting over: `./run.sh clean` deletes the vector store so demo 06 rebuilds
from scratch.

---

## What is in here

```
run.sh                     everything goes through this
demo/                      the eight demos + ingestion_pipeline.py
demo/docs/                 the five source articles
slides/                    the deck - reveal.js and fonts vendored, fully offline
SCRIPT.md                  word-for-word narration, every slide
tools/                     regenerate the docs, corpus, and site
```

Presenting or editing it yourself? See **[docs/MAINTAINING.md](docs/MAINTAINING.md)**.
