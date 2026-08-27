#!/usr/bin/env bash
# One entry point for the whole presentation.
#
#   ./run.sh setup        create the venv, install packages, fetch documents
#   ./run.sh slides       serve the deck and open it in your browser
#   ./run.sh demo 5       run one demo (1-8), or "all" to run them in order
#   ./run.sh check        preflight: verify everything before you hit record
#   ./run.sh script       regenerate SCRIPT.md and the README tables
#   ./run.sh clean        delete the vector store so demo 06 starts fresh

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO="$ROOT/demo"
PY="$DEMO/venv/bin/python"
PORT="${PORT:-8000}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }
info() { printf '  \033[2m%s\033[0m\n' "$*"; }

open_url() {
  if [ -d "/Applications/Brave Browser.app" ]; then
    open -a "Brave Browser" "$1" 2>/dev/null && return
  fi
  open "$1" 2>/dev/null || info "open $1 in your browser"
}

cmd_setup() {
  bold "Setting up"
  command -v python3 >/dev/null || { bad "python3 not found"; exit 1; }
  ok "python3 $(python3 -c 'import sys;print(".".join(map(str,sys.version_info[:3])))')"

  if [ ! -x "$PY" ]; then
    info "creating virtual environment ..."
    python3 -m venv "$DEMO/venv" || { bad "could not create venv"; exit 1; }
  fi
  ok "virtual environment"

  info "installing packages (this is the slow part) ..."
  "$DEMO/venv/bin/pip" install -q --upgrade pip
  "$DEMO/venv/bin/pip" install -q -r "$DEMO/requirements.txt" \
    || { bad "pip install failed"; exit 1; }
  ok "packages installed"

  if ! ls "$DEMO"/docs/*.txt >/dev/null 2>&1; then
    info "downloading the five source articles ..."
    python3 "$ROOT/tools/fetch_docs.py"
  fi
  ok "documents ($(ls "$DEMO"/docs/*.txt 2>/dev/null | wc -l | tr -d ' ') files)"

  if [ ! -f "$DEMO/.env" ]; then
    cp "$DEMO/.env.example" "$DEMO/.env"
    bad "now put your OpenAI key in demo/.env"
    info "get one at https://platform.openai.com -> Settings -> API keys"
  else
    ok "demo/.env exists"
  fi

  echo
  bold "Next:  ./run.sh check     then    ./run.sh slides"
}

cmd_check() {
  bold "Preflight"
  local fail=0

  [ -x "$PY" ] && ok "virtual environment" || { bad "no venv - run ./run.sh setup"; fail=1; }

  if [ -x "$PY" ]; then
    if "$PY" -c "import langchain_openai, langchain_chroma, tiktoken" 2>/dev/null; then
      ok "packages import"
    else
      bad "packages missing - run ./run.sh setup"; fail=1
    fi
  fi

  local n; n=$(ls "$DEMO"/docs/*.txt 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" -ge 1 ] && ok "documents ($n files)" \
                 || { bad "no documents - run: python3 tools/fetch_docs.py"; fail=1; }

  # A key can be missing, still the placeholder, invalid, or valid but with no
  # credit. All four look different on camera, so test the real thing.
  local keysrc=""
  if [ -f "$DEMO/.env" ] && grep -qE '^OPENAI_API_KEY=sk-[A-Za-z0-9_-]{20,}$' "$DEMO/.env" 2>/dev/null \
     && ! grep -q 'xxxx' "$DEMO/.env"; then
    keysrc="demo/.env"
  elif [ -n "${OPENAI_API_KEY:-}" ]; then
    keysrc="the environment"
  fi

  if [ -z "$keysrc" ]; then
    if [ -f "$DEMO/.env" ] && grep -q 'xxxx' "$DEMO/.env" 2>/dev/null; then
      bad "demo/.env still has the placeholder key - paste your real one in"
    else
      bad "no OpenAI key - put one in demo/.env"
    fi
    fail=1
  elif [ -x "$PY" ]; then
    local probe
    probe=$("$PY" - <<'PYCHK' 2>/dev/null
import os, sys
sys.path.insert(0, "demo")
try:
    from dotenv import load_dotenv
    load_dotenv("demo/.env")
    from openai import OpenAI
    OpenAI().embeddings.create(model="text-embedding-3-small", input="ping")
    print("OK")
except Exception as e:
    name = type(e).__name__
    msg = str(e).lower()
    if "quota" in msg or "billing" in msg:
        print("NOCREDIT")
    elif "api_key" in msg or "authentication" in name.lower() or "401" in msg:
        print("BADKEY")
    elif "connect" in msg or "timeout" in msg or "network" in msg:
        print("OFFLINE")
    else:
        print("ERR:" + name)
PYCHK
)
    case "$probe" in
      OK)       ok "API key works ($keysrc) - a live call succeeded" ;;
      NOCREDIT) bad "key is valid but the account has no credit - add funds in Billing"; fail=1 ;;
      BADKEY)   bad "key was rejected by OpenAI - check demo/.env"; fail=1 ;;
      OFFLINE)  info "key present ($keysrc); could not reach OpenAI to verify it" ;;
      *)        info "key present ($keysrc); could not verify it ($probe)" ;;
    esac
  else
    ok "API key present in $keysrc"
  fi

  if [ -d "$DEMO/db_chroma" ]; then
    ok "vector store built (demos 07 and 08 will work)"
  else
    info "no vector store yet - run ./run.sh demo 6 to build it"
  fi

  local slides; slides=$(grep -c '<section' "$ROOT/slides/index.html")
  ok "deck present ($slides slides)"
  [ -f "$ROOT/slides/data.js" ] && ok "interactive slide data" \
                                || { bad "slides/data.js missing"; fail=1; }

  echo
  if [ "$fail" -eq 0 ]; then bold "Ready to record."; else bold "Fix the above, then re-run."; fi
  return "$fail"
}

cmd_slides() {
  command -v python3 >/dev/null || { bad "python3 not found"; exit 1; }
  echo
  bold "Slides    http://localhost:$PORT/"
  info "press S in the deck for the speaker window (notes, timer, next slide)"
  info "keys: arrows navigate - F fullscreen - O overview - B blank screen"
  info "Ctrl-C to stop"
  echo
  ( sleep 1; open_url "http://localhost:$PORT/" ) &
  cd "$ROOT/slides" && exec python3 -m http.server "$PORT"
}

cmd_demo() {
  local which="${1:-}"
  [ -x "$PY" ] || { bad "no venv - run ./run.sh setup"; exit 1; }
  cd "$DEMO" || exit 1

  if [ "$which" = "all" ]; then
    for f in 0*.py; do
      bold "── $f"
      "$PY" "$f" || { bad "$f failed"; exit 1; }
      echo
    done
    return
  fi

  local file
  file=$(ls "$DEMO"/0"${which}"_*.py 2>/dev/null | head -1)
  if [ -z "$file" ]; then
    bad "no demo '$which'. Available:"
    for f in "$DEMO"/0*.py; do info "  $(basename "$f")"; done
    exit 1
  fi
  shift || true
  exec "$PY" "$file" "$@"
}

cmd_script()  { python3 "$ROOT/tools/build_script.py"; }
cmd_clean()   { rm -rf "$DEMO/db_chroma" "$DEMO/db_mismatch"; ok "vector stores deleted"; }

case "${1:-}" in
  setup)  cmd_setup ;;
  check)  cmd_check ;;
  slides) cmd_slides ;;
  demo)   shift; cmd_demo "$@" ;;
  script) cmd_script ;;
  clean)  cmd_clean ;;
  *)
    bold "RAG work-along presentation"
    echo
    echo "  ./run.sh setup        create the venv, install packages, fetch documents"
    echo "  ./run.sh slides       serve the deck and open it in your browser"
    echo "  ./run.sh demo 5       run one demo (1-8), or 'all' for every demo in order"
    echo "  ./run.sh check        preflight: verify everything before you hit record"
    echo "  ./run.sh script       regenerate SCRIPT.md and the README tables"
    echo "  ./run.sh clean        delete the vector store so demo 06 starts fresh"
    echo
    ;;
esac
