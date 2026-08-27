#!/usr/bin/env python3
"""Re-download the self-hosted webfonts into slides/fonts/ and rebuild fonts.css.

    python3 tools/fetch_fonts.py

The deck claims to work offline, so its fonts cannot come from Google. This
pulls the woff2 files once, keeps latin and latin-ext only, and writes
slides/fonts.css with local @font-face rules. Run it only if the type stack
in slides/tokens.css changes.
"""
import hashlib
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "slides" / "fonts"
CSS = ROOT / "slides" / "fonts.css"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"}
URL = ("https://fonts.googleapis.com/css2"
       "?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800"
       "&family=JetBrains+Mono:wght@400;500;700"
       "&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap")


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    css = get(URL).decode("utf-8")
    blocks = [b for b in re.split(r"(?=/\* [a-z-]+ \*/)", css)
              if b.strip().startswith(("/* latin */", "/* latin-ext */"))]

    rules, seen, total = [], {}, 0
    for b in blocks:
        src = re.search(r"src: url\((https://[^)]+)\)", b)
        fam = re.search(r"font-family: '([^']+)'", b)
        if not (src and fam):
            continue
        url = src.group(1)
        if url not in seen:
            data = get(url)
            name = fam.group(1).lower().replace(" ", "-")
            sub = "latinext" if "latin-ext" in b.split("\n")[0] else "latin"
            fn = f"{name}-{sub}-{hashlib.md5(url.encode()).hexdigest()[:6]}.woff2"
            (OUT / fn).write_bytes(data)
            seen[url] = fn
            total += len(data)
        rules.append(b.replace(url, f"fonts/{seen[url]}").strip())

    CSS.write_text(
        "/* Self-hosted so the deck genuinely works offline, with no third-party\n"
        "   requests. Latin and Latin-Extended only.\n"
        "   Regenerate with: python3 tools/fetch_fonts.py */\n\n"
        + "\n\n".join(rules) + "\n", encoding="utf-8")
    print(f"  {len(seen)} files, {total // 1024} KB -> slides/fonts/")
    print("  NOTE: the preload filenames are hashed. If they changed, update the")
    print("        FONTS constant in tools/build_site.mjs and the <link> tags in")
    print("        slides/index.html, site/index.html, site/404.html, site/og.html.")


if __name__ == "__main__":
    main()
