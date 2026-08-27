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

WORDS_PER_MINUTE = 135  # unhurried presenting pace


def strip_tags(fragment):
    fragment = re.sub(r"<br\s*/?>", " ", fragment)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    fragment = html.unescape(fragment)
    return re.sub(r"\s+", " ", fragment).strip()


def parse(deck_html):
    slides = []
    # Sections are not nested in this deck, so a non-greedy split is safe.
    for raw in re.findall(r"<section\b[^>]*>(.*?)</section>", deck_html, re.S):
        notes_match = re.search(r'<aside class="notes">(.*?)</aside>', raw, re.S)
        notes = html.unescape(notes_match.group(1)).strip() if notes_match else ""

        body = raw[: notes_match.start()] if notes_match else raw

        heading = re.search(r"<h[12][^>]*>(.*?)</h[12]>", body, re.S)
        eyebrow = re.search(r'<span class="eyebrow">(.*?)</span>', body, re.S)
        cues = re.findall(r'<span class="cmd">(.*?)</span>', body, re.S)

        slides.append({
            "title": strip_tags(heading.group(1)) if heading else "(untitled)",
            "eyebrow": strip_tags(eyebrow.group(1)) if eyebrow else "",
            "cues": [strip_tags(c) for c in cues],
            "notes": notes,
        })
    return slides


def main():
    if not DECK.exists():
        sys.exit(f"deck not found: {DECK}")
    slides = parse(DECK.read_text(encoding="utf-8"))

    total_words = sum(len(s["notes"].split()) for s in slides)
    minutes = round(total_words / WORDS_PER_MINUTE)

    out = []
    out.append("# Recording script\n")
    out.append(
        "Word-for-word narration for every slide. Generated from the speaker notes\n"
        "in `slides/index.html` - **edit the deck, not this file**, then re-run\n"
        "`python3 tools/build_script.py`.\n"
    )
    out.append(
        f"| | |\n|---|---|\n"
        f"| Slides | {len(slides)} |\n"
        f"| Narration | ~{total_words:,} words |\n"
        f"| Estimated runtime | ~{minutes} minutes of speaking, "
        f"plus demo time |\n"
        f"| Live demos | {sum(1 for s in slides if s['cues'])} slides carry a command |\n"
    )
    out.append(
        "\n`[RUN DEMO n]` in the narration marks where to switch to the terminal.\n"
        "\n---\n"
    )

    for i, s in enumerate(slides, 1):
        out.append(f"\n## Slide {i} — {s['title']}\n")
        meta = []
        if s["eyebrow"]:
            meta.append(f"**Section:** {s['eyebrow']}")
        for cue in s["cues"]:
            meta.append(f"**Run:** `{cue}`")
        if meta:
            out.append("  \n".join(meta) + "\n")
        out.append("\n" + s["notes"].strip() + "\n")

    OUT.write_text("\n".join(out), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    print(f"  {len(slides)} slides, ~{total_words:,} words, ~{minutes} min of speaking")


if __name__ == "__main__":
    main()
