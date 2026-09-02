# Maintaining and presenting

Notes for editing the lesson, presenting it, and deploying the site.
If you just want to work through the lesson, the [README](../README.md) is
all you need.

---

## Presenting

```bash
./run.sh slides
```

Press **S** for the speaker window — narration, timer, and a preview of the
next slide. That is the window for your second monitor while recording.

Keys: `→ / ←` navigate · `S` speaker view · `F` fullscreen · `O` overview ·
`B` blank the screen.

You can also open `slides/index.html` directly. Every slide and all five
widgets work over `file://`; the only thing that needs the server is the
speaker window, because it opens a second page.

Served on its own, the deck is the *full work-along* edition and the control
bar drops the buttons that would be dead ends — the edition and mode switches,
the link home. Those need the built site, where the other editions exist.

**The deck is genuinely offline.** Reveal is vendored and the webfonts are
self-hosted in `slides/fonts/`, so presenting needs no network at all — worth
knowing before you rely on conference wifi. If you change the type stack in
`tokens.css`, re-run `python3 tools/fetch_fonts.py` and update the preload
filenames it prints.

Cues in the narration:

- `[RUN DEMO n]` — switch to the terminal and run that demo.
- `[CLICK ...]` / `[DRAG ...]` — drive the widget on the current slide.

---

## Editing

Narration lives in **one** place: the `<aside class="notes">` blocks in
`slides/index.html`. After editing:

```bash
./run.sh script
```

That regenerates `SCRIPT.md` **and** the two tables in the README, deriving
slide numbers from the deck. Never edit `SCRIPT.md` or those tables by hand —
they are generated, and hand-edits get overwritten.

This matters more than it sounds: inserting the five interactive slides once
shifted every slide number after slide 9 and silently invalidated a
hand-written table.

---

## The six editions

Two independent axes — three lengths and two modes — so six complete lessons
out of one source file.

**Length** — every slide carries a track marker, and the tiers nest:

```html
<section data-track="essential">  <!-- essentials, short and full -->
<section data-track="core">       <!-- short and full -->
<section>                         <!-- full only -->
```

**Essentials and short both use tighter narration**; only the full edition keeps
the unhurried phrasing. Cutting slides alone does not control runtime — the
median slide in the full edition carries about 200 spoken words, so 36 slides
of it still runs 56 minutes:

```html
<aside class="notes">…the unhurried version…</aside>
<aside class="brief">…the same teaching, written tight…</aside>
```

`brief` is written **mode-neutral**, so it serves talk and work-along alike and
needs no talk variant of its own. A slide with no `brief` falls back to its
normal narration — so every slide in the short and essentials tiers needs one,
or that tier silently gets slower.

Timings are computed at 125 words per minute, which is presenting pace with
pauses, not read-aloud pace.

**Every tier needs the chapter dividers.** The reading view builds its contents
list from them, so a tier that drops them gets a one-item contents list that
looks broken rather than short. They cost about fifty words each.

**Mode** — work-along (you run the demos live) or talk-only (you explain output
that is already on the slide). Slides whose narration changes carry a second
narration block:

```html
<aside class="notes">…run it live: "let me run demo one"…</aside>
<aside class="talk">…talk version: "here is what that produces"…</aside>
```

A slide with no `<aside class="talk">` uses the same narration in both modes,
which is most of them — the slides that need one are the demo cues plus the few
that tell the audience to type something. `data-talk-title` on a section swaps
the heading too, used where a title assumes a live terminal.

In talk builds the demo cue bar is relabelled from "Demo 01" to "Output of" and
restyled as quiet provenance rather than an instruction.

Slide **body** text is not rewritten by the build, so a line that only makes
sense in one mode carries a class and the deck hides the other one:

```html
<p class="mode-wa">…a terminal on the other; I stop and run the command…</p>
<p class="mode-talk">…every orange bar names a command that was really run…</p>
```

Which narration an edition speaks is decided in exactly one function —
`notesFor()` in `build_site.mjs`, mirrored by `notes_for()` in
`build_script.py`. Every runtime quoted anywhere (the site, `/present/`, the
README table) is derived from it, so the numbers cannot disagree.

| | Work-along | Talk only |
|---|---|---|
| **Essentials** | `/deck/essentials/` | `/deck/talk-essentials/` |
| **Short** | `/deck/short/` | `/deck/talk-short/` |
| **Full** | `/deck/` | `/deck/talk/` |

Same six under `/read/`. The deck's length button cycles the three tiers.

The deck's control bar carries both toggles. `/present/` prints a cue sheet per
length, and `SCRIPT.md` marks which slides are in the short edit.

To move a slide between edits, add or remove that one attribute and re-run
`./run.sh script` (for the docs) and `node tools/build_site.mjs` (for the site).
Nothing else needs touching — no list to keep in sync.

The short edit keeps the whole spine and **all eight terminal demos**. What it
drops is elaboration: reference tables, the loader gotchas, the re-run trap,
troubleshooting, the check-yourself drills, and three of the five playgrounds.
It is a tighter cut, not a summary.

The short deck is generated by removing the non-core sections and rewriting
relative asset paths one level up, so `/deck/short/` still loads `/deck/`'s
vendored reveal, tokens and widget code rather than duplicating them.

---

## The tools

| Tool | What it does |
|---|---|
| `tools/fetch_docs.py` | Downloads the five articles and normalises them. |
| `tools/build_script.py` | Regenerates `SCRIPT.md` and the README tables. |
| `tools/export_slide_data.py` | Recomputes the real vectors in `slides/data.js`. |
| `tools/build_site.mjs` | Assembles `dist/` for deployment. No dependencies. |
| `tools/make_og.mjs` | Re-renders the social card to `site/og.png`. Needs playwright. |
| `tools/fetch_fonts.py` | Re-downloads the self-hosted webfonts into `slides/fonts/`. |
| `tools/build_highlight.mjs` | Rebuilds the minimal syntax-highlighting bundle. |

`fetch_docs.py` does one non-obvious thing. Wikipedia's plain-text export
separates paragraphs with a single newline, and the lesson's splitter splits on
blank lines. Without normalising, `CharacterTextSplitter` finds almost no break
points and emits 8,000-character chunks that are useless for retrieval.

---

## The site

```bash
node tools/build_site.mjs          # -> dist/
npx serve dist                     # or any static server
```

Routes: `/` landing · `/deck/` the slides · `/read/` the lesson as a document ·
`/play/` the five playgrounds on one page · `/present/` the presenter's cue
sheet. Each of the six editions has its own `/deck/…` and `/read/…` path.
`/script/` is a redirect kept alive for old links.

`robots.txt` and `sitemap.xml` are walked out of `dist/` after everything is
written, so a new route is listed the moment it exists.

The reading, playground and presenter pages are **derived from
`slides/index.html`** at build time, so they cannot drift from the deck.

### Deploying

```bash
vercel deploy --prod
```

Two things that will bite you if you change the config:

- **`trailingSlash` must stay `true`.** The deck uses relative asset paths. With
  it off, `/deck/` redirects to `/deck` and every asset resolves against the
  site root.
- **Anchor `.vercelignore` paths with a leading slash.** An unanchored `dist/`
  also matches `slides/vendor/reveal/dist/` and strips reveal.js from the
  upload.

Neither shows up locally. Check the deployed URL, not just localhost.

---

## The retrieval playground's real scores

The playground chunks a fixed document, so the chunks never change and can be
embedded once. Only the **scores** ship — a 4×4 matrix rather than megabytes
of vectors:

```bash
node tools/build_site.mjs && npx serve dist -l 8912
node tools/extract_retrieval_corpus.mjs   # writes tools/retrieval-corpus.json
demo/venv/bin/python tools/export_slide_data.py
```

The corpus file is written by the widget itself (`window.__ragRetrieval`), so
the embedded strings are exactly what a visitor sees — the export cannot drift
from the page. If you edit `RETR_DOC` or the chunk parameters in
`interactive.js`, re-run those three commands or the preset scores silently
stop matching their chunks.

A question the visitor types still cannot be embedded in a browser, so it
falls back to a character-trigram measure and the panel labels itself
`approximate` rather than pretending otherwise.

## Syntax highlighting

Reveal vendors the whole of highlight.js — 918KB to colour three languages,
plus a second 918KB ESM copy that is never loaded. The deck only uses python,
bash and plaintext, so `tools/build_highlight.mjs` bundles highlight.js core
with just those, wrapped together with reveal's plugin:

```bash
npm pack highlight.js && tar xzf highlight.js-*.tgz
node tools/build_highlight.mjs ./package
```

918KB becomes 107KB, and the deck's payload drops from ~1.2MB to ~230KB.

`slides/vendor/` holds only the five files the deck actually loads. Reveal's
distribution also ships unbundled ES source (`plugin/*/plugin.js`, which
`import`s from npm and cannot run in a browser), an ESM copy of the notes
plugin, a standalone `speaker-view.html` that `notes.js` inlines anyway, and
two dark syntax themes this deck does not use. They were deleted; if you
re-vendor reveal, delete them again.

Colours live in `slides/syntax.css`, drawn from the site palette. Reveal's
bundled zenburn is a *dark* theme and rendered pale yellow on white paper —
close to illegible on the slides that matter most. Every syntax colour now
clears AA in both themes.

## Recording safety

Three things protect a take:

- **The control bar fades.** It sits in the corner of every recorded frame, so
  it drops to zero opacity after about two and a half seconds of no input and
  returns on any mouse movement. It stays up while the narration drawer is open
  or while it has keyboard focus.

- **The embedding cache.** `demo/.embedding_cache/` is keyed by model,
  dimensions and text, so any demo you have rehearsed re-runs with no network
  at all. Do a full `./run.sh follow` before recording and the live session
  cannot fail on OpenAI.
- **Friendly errors.** `_demo.py` installs an excepthook that turns the five
  failures that actually happen — bad key, no credit, rate limit, no network,
  missing documents — into a single readable line. Anything unexpected still
  prints a full traceback, because hiding a real bug would be worse.

## Colour and contrast

`slides/tokens.css` is the only place colours are defined. Four tokens do the
work that one usually does, and mixing them up is how contrast regressions get
in:

| Token | Use it for |
|---|---|
| `--accent` | fills, rules, large figures, chart marks |
| `--accent-text` | **any accent-coloured text below 24px** |
| `--on-accent` | text sitting *on* an accent fill (buttons, active chips) |
| `--ink-faint` | de-emphasised text — already at the AA floor, do not lighten |

Every text/background pair on the site and in the deck clears WCAG AA (4.5:1
for body, 3:1 for large) in **both** themes. That was measured, not eyeballed —
an earlier palette failed at 2.75:1 on the eyebrow labels that appear on every
slide. If you change a colour, re-measure rather than trusting your eye.

The social card is a real render of the site's own hero:

```bash
node tools/build_site.mjs
npx serve dist -l 8912          # or python3 -m http.server 8912 -d dist
node tools/make_og.mjs          # -> site/og.png, commit it
```

---

## Where the numbers differ from the source lessons

These are real outputs, so a few figures moved:

- The source says *"Retrieval augmented generation is powerful"* is 9 tokens.
  The real `cl100k_base` tokenizer gives **7**. Demo 01 prints the true count.
- The source gets **797** chunks; this corpus gives **539** at
  `chunk_overlap=0` and **547** at `100`. Article lengths differ, and the
  source says to expect this.
- The source's table implies *kitten* is closest to *cat*. Real embeddings put
  **dog** first. Demo 03 derives its commentary from the actual output and
  explains why.

Embeddings are cached on disk (`demo/.embedding_cache/`) keyed by model,
dimensions and text, so rehearsing a demo twenty times costs money once. The
vectors are genuine API results. `ingestion_pipeline.py` deliberately has no
cache.
