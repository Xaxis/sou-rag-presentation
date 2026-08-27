#!/usr/bin/env bash
# Serve the slides and open them. Reveal's speaker view (press S) needs the
# deck served over http rather than opened as a file://, so use this rather
# than double-clicking index.html.
set -euo pipefail
cd "$(dirname "$0")/slides"
PORT="${1:-8000}"
echo
echo "  Slides      http://localhost:$PORT/"
echo "  Speaker view — focus the deck and press S (allow the popup)"
echo "  Stop        Ctrl-C"
echo
python3 -m http.server "$PORT"
