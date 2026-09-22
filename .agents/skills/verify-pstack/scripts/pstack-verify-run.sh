#!/usr/bin/env bash
# verify-pstack run — execute one opencode CLI drive inside a verification instance.
# Usage: pstack-verify-run.sh <run-root> --mode <mode> [args]
# Modes:
#   debug-skill            list skills via `opencode debug skill` (no model call)
#   debug-agent --agent N  show agent N via `opencode debug agent` (no model call)
#   run -- <prompt...>     one headless `opencode run` turn (model call; needs auth)
# All commands run with cwd=<run-root> and an isolated HOME so the drive never
# touches the user's session. Prints the child command's stdout.
set -u
ROOT="${1:?usage: pstack-verify-run.sh <run-root> --mode <mode>}"
shift
MODE=""
AGENT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="${2:?}"; shift 2 ;;
    --agent) AGENT="${2:?}"; shift 2 ;;
    --) shift; break ;;
    *) break ;;
  esac
done
[ -n "$MODE" ] || { echo "run: --mode required" >&2; exit 1; }
[ -d "$ROOT" ] || { echo "run: run root missing: $ROOT" >&2; exit 1; }

export HOME="$ROOT/home"
export XDG_CONFIG_HOME="$ROOT/home/.config"
export XDG_DATA_HOME="$ROOT/home/.local/share"
export XDG_CACHE_HOME="$ROOT/home/.cache"
mkdir -p "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$XDG_CACHE_HOME"

case "$MODE" in
  debug-skill)
    cd "$ROOT" && exec opencode debug skill ;;
  debug-agent)
    [ -n "$AGENT" ] || { echo "run: --agent required for debug-agent" >&2; exit 1; }
    cd "$ROOT" && exec opencode debug agent "$AGENT" ;;
  run)
    cd "$ROOT" && exec opencode run "$@" ;;
  *)
    echo "run: unknown mode: $MODE" >&2; exit 2 ;;
esac
