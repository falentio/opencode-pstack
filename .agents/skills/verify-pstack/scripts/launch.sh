#!/usr/bin/env bash
# verify-pstack launch — create one isolated verification instance.
# Usage: RUN_JSON=$(launch.sh <pstack-repo>)
# Prints the RUN_ROOT path on stdout. All state lives under RUN_ROOT:
#   RUN_ROOT/opencode.json  local per-project config loading the plugin from build
#   RUN_ROOT/home/          isolated HOME (auth, cache, state)
# The caller owns teardown via cleanup.sh. Never touches the user's real HOME.
set -u
REPO="${1:?usage: launch.sh <pstack-repo>}"
[ -d "$REPO" ] || { echo "launch: repo missing: $REPO" >&2; exit 1; }

ROOT="$(mktemp -d /tmp/pstack-verify-XXXXXX)"
export PSTACK_REPO="$REPO"
export PSTACK_RUN_ROOT="$ROOT"
mkdir -p "$ROOT/home"

printf '{\n  "$schema": "https://opencode.ai/config.json",\n  "plugin": ["%s"]\n}\n' "$REPO" > "$ROOT/opencode.json"

# Make helpers resolvable inside herdr panes that only inherit env, not PATH.
VERIFY_BIN="$REPO/.agents/skills/verify-pstack/scripts"
case ":$PATH:" in
  *":$VERIFY_BIN:"*) ;;
  *) export PATH="$VERIFY_BIN:$PATH" ;;
esac

echo "$ROOT"
