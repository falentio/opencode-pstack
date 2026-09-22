#!/usr/bin/env bash
# verify-pstack cleanup — tear down instances this run created.
# Usage: cleanup.sh <run-root> [--keep-root]
# Kills nothing by name: the only long-lived processes a drive may own are
# `opencode serve` children started with cwd=<run-root>; those are stopped by
# killing the recorded server PID file when present. Removes scratch state
# (run root) but NEVER the evidence dir named by the skill.
# With --keep-root the directory listing is left for inspection (used by --dry).
set -u
ROOT="${1:?usage: cleanup.sh <run-root> [--keep-root]}"
KEEP="${2:-}"

if [ -f "$ROOT/serve.pid" ]; then
  PID="$(cat "$ROOT/serve.pid")"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      kill -0 "$PID" 2>/dev/null || break
      sleep 0.5
    done
    kill -9 "$PID" 2>/dev/null || true
  fi
fi

if [ "$KEEP" = "--keep-root" ]; then
  echo "cleanup: kept $ROOT"
  exit 0
fi

rm -rf "$ROOT"
echo "cleanup: removed $ROOT"
