#!/usr/bin/env python3
"""Generate SCRIPT.md - the slide-by-slide narration - from the deck.

The narration lives in one place only: the <aside class="notes"> block of each
slide in slides/index.html. Reveal shows it in the speaker window (press S),
and this script renders the same text as a document you can read from while
recording. Because both come from the same source, they cannot drift apart.

    python3 tools/build_script.py
"""
import html
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DECK = ROOT / "slides" / "index.html"
OUT = ROOT / "SCRIPT.md"
README = ROOT / "README.md"

# What each demo is for. Slide numbers are derived from the deck, never typed.
DEMO_SHOWS = {
    "01_tokens.py": "Tokens are not words; the corpus-vs-context-window scale gap",
    "02_embedding_shape.py": "Any length of text in, always 1,536 numbers out",
    "03_similar_meaning.py": "Similar meaning really does give similar numbers",
    "04_load.py": "Reading files into `Document` objects, and metadata",
    "05_chunk.py": "Chunking, why 800 is a target, what overlap buys you",
    "06_embed_store.py": "`Chroma.from_documents` embeds **and** stores",
    "07_query.py": "Retrieval, and the real prompt that reaches the LLM",
    "08_model_mismatch.py": "The silent failure: wrong model, no error, wrong chunks",
    "fetch_docs.py": "Downloads and normalises the five source articles",
}

IX_SHOWS = {
    "ix-scale": ("Corpus scale explorer",
                 "Drag 1 MB to 1 PB; watch tokens, embedding cost and context windows needed"),
    "ix-embed": ("Neighbourhood map",
                 "Click any word; similarity bars and a 2-D projection re-rank live"),
    "ix-chunk": ("Chunking playground",
                 "Drag `chunk_size` and `chunk_overlap`; chunks re-cut, overlap highlighted"),
    "ix-retr": ("Retrieval playground",
                "Type a question, move top *k*, watch the prompt assemble itself"),
    "ix-mismatch": ("Mismatch toggle",
                    "Flip the query model and watch retrieval break with zero errors raised"),
}

WORDS_PER_MINUTE = 125  # presenting pace, including pauses


def strip_tags(fragment):
    fragment = re.sub(r"<br\s*/?>", " ", fragment)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    fragment = html.unescape(fragment)
    return re.sub(r"\s+", " ", fragment).strip()


def parse(deck_html):
    slides = []
    # Sections are not nested in this deck, so a non-greedy split is safe.
    for attrs, raw in re.findall(r"<section\b([^>]*)>(.*?)</section>", deck_html, re.S):
        notes_match = re.search(r'<aside class="notes">(.*?)</aside>', raw, re.S)
        notes = html.unescape(notes_match.group(1)).strip() if notes_match else ""

        body = raw[: notes_match.start()] if notes_match else raw

        heading = re.search(r"<h[12][^>]*>(.*?)</h[12]>", body, re.S)
        eyebrow = re.search(r'<span class="eyebrow">(.*?)</span>', body, re.S)
        cues = re.findall(r'<span class="cmd">(.*?)</span>', body, re.S)

        widgets = re.findall(r'id="(ix-[a-z]+)"', body)
        core = 'data-track="core"' in attrs or 'data-track="essential"' in attrs
        essential = 'data-track="essential"' in attrs
        bi = raw.find('<aside class="brief">')
        brief = "" if bi == -1 else raw[bi + len('<aside class="brief">'):
                                        raw.find('</aside>', bi)].strip()

        slides.append({
            "title": strip_tags(heading.group(1)) if heading else "(untitled)",
            "eyebrow": strip_tags(eyebrow.group(1)) if eyebrow else "",
            "cues": [strip_tags(c) for c in cues],
            "widgets": widgets,
            "core": core,
            "essential": essential,
            "brief": brief,
            "notes": notes,
        })
    return slides


def render_tables(slides):
    """Build the two README tables from the deck, so they cannot go stale."""
    demo_rows = {}
    for i, s in enumerate(slides, 1):
        for cue in s["cues"]:
            for script, shows in DEMO_SHOWS.items():
                if script in cue:
                    demo_rows.setdefault(script, {"cue": cue, "slides": [],
                                                  "shows": shows})
                    demo_rows[script]["slides"].append(i)

    demo = ["| Demo | Slide | Command | What it shows |", "|---|---|---|---|"]
    for script in sorted(demo_rows, key=lambda k: (k == "fetch_docs.py", k)):
        r = demo_rows[script]
        num = script[:2] if script[:2].isdigit() else "—"
        where = ", ".join(str(n) for n in r["slides"])
        demo.append(f"| {num} | **{where}** | `{r['cue']}` | {r['shows']} |")

    ix = ["| Slide | Widget | What you do on camera |", "|---|---|---|"]
    for i, s in enumerate(slides, 1):
        for w in s["widgets"]:
            if w in IX_SHOWS:
                name, what = IX_SHOWS[w]
                ix.append(f"| **{i}** | {name} | {what} |")

    return "\n".join(demo), "\n".join(ix)


def splice(text, marker, block):
    start = f"<!-- BEGIN:{marker} -->"
    end = f"<!-- END:{marker} -->"
    if start not in text or end not in text:
        return text, False
    head = text[: text.index(start) + len(start)]
    tail = text[text.index(end):]
    return head + "\n" + block + "\n" + tail, True


def main():
    if not DECK.exists():
        sys.exit(f"deck not found: {DECK}")
    slides = parse(DECK.read_text(encoding="utf-8"))

    total_words = sum(len(s["notes"].split()) for s in slides)
    minutes = round(total_words / WORDS_PER_MINUTE)
    core = [s for s in slides if s["core"]]
    core_minutes = round(
        sum(len((s["brief"] or s["notes"]).split()) for s in core) / WORDS_PER_MINUTE)
    ess = [s for s in slides if s["essential"]]
    ess_minutes = round(
        sum(len((s["brief"] or s["notes"]).split()) for s in ess) / WORDS_PER_MINUTE)

    out = []
    out.append("# Recording script\n")
    out.append(
        "Word-for-word narration for every slide. Generated from the speaker notes\n"
        "in `slides/index.html` - **edit the deck, not this file**, then re-run\n"
        "`python3 tools/build_script.py`.\n"
    )
    out.append(
        f"| | |\n|---|---|\n"
        f"| Essentials | {len(ess)} slides · ~{ess_minutes} min |\n"
        f"| Short edit | {len(core)} slides · ~{core_minutes} min |\n"
        f"| Full lesson | {len(slides)} slides · ~{minutes} min |\n"
        f"| Live demos | {sum(1 for s in slides if s['cues'])} slides carry a command |\n"
    )
    out.append(
        "\n`[RUN DEMO n]` in the narration marks where to switch to the terminal.\n"
        "\n---\n"
    )

    for i, s in enumerate(slides, 1):
        if s["essential"]:
            mark = " · **essentials**"
        elif s["core"]:
            mark = " · **short edit**"
        else:
            mark = ""
        out.append(f"\n## Slide {i} — {s['title']}{mark}\n")
        meta = []
        if s["eyebrow"]:
            meta.append(f"**Section:** {s['eyebrow']}")
        for cue in s["cues"]:
            meta.append(f"**Run:** `{cue}`")
        if meta:
            out.append("  \n".join(meta) + "\n")
        out.append("\n" + s["notes"].strip() + "\n")
        if s["brief"]:
            out.append("\n> **Essentials edition — tighter narration:**\n>\n"
                       + "\n".join("> " + ln if ln.strip() else ">"
                                    for ln in s["brief"].splitlines()) + "\n")

    OUT.write_text("\n".join(out), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    print(f"  full  {len(slides)} slides, ~{total_words:,} words, ~{minutes} min")
    print(f"  short {len(core)} slides, ~{core_minutes} min")
    print(f"  ess   {len(ess)} slides, ~{ess_minutes} min")

    # keep the README's two tables in step with the deck
    if README.exists():
        demo_tbl, ix_tbl = render_tables(slides)
        S = "https://ragverse.diy"
        editions = (
            "| | Talk only (no terminal) | Work-along (you run the demos) |\n"
            "|---|---|---|\n"
            f"| **Essentials** · {len(ess)} slides | "
            f"[~{ess_minutes} min]({S}/read/talk-essentials/) "
            f"| [~{ess_minutes + 12} min]({S}/read/essentials/) |\n"
            f"| **Short** · {len(core)} slides | [~{core_minutes} min]({S}/read/talk-short/) "
            f"| [~{core_minutes + 12} min]({S}/read/short/) |\n"
            f"| **Full** · {len(slides)} slides | [~{minutes} min]({S}/read/talk/) "
            f"| [~{minutes + 12} min]({S}/read/) |"
        )
        text = README.read_text(encoding="utf-8")
        text, ok1 = splice(text, "demo-table", demo_tbl)
        text, ok2 = splice(text, "ix-table", ix_tbl)
        text, _ = splice(text, "editions", editions)
        text = re.sub(r"A \d+-slide deck", f"A {len(slides)}-slide deck", text)
        text = re.sub(r"narration for all \d+ slides\. ~\d+ minutes",
                      f"narration for all {len(slides)} slides. ~{minutes} minutes", text)
        README.write_text(text, encoding="utf-8")
        print(f"  README tables: demo={'ok' if ok1 else 'MARKER MISSING'}, "
              f"interactive={'ok' if ok2 else 'MARKER MISSING'}")


if __name__ == "__main__":
    main()
