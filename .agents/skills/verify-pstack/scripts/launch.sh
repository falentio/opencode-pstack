#!/usr/bin/env bash
# verify-pstack launch — create one isolated verification instance (opencode v2).
# Usage: RUN_ROOT=$(launch.sh <pstack-repo>)
# Prints the RUN_ROOT path on stdout. All state lives under RUN_ROOT:
#   RUN_ROOT/opencode.json                 minimal project config (schema only)
#   RUN_ROOT/.opencode/plugins/pstack      symlink to the checkout (loads from build, never npm)
# RUN_ROOT is git-initialized: v2 location services (debug agents, sessions)
# only resolve projects inside a worktree; without .git most probes return [].
# Isolation boundary is the project directory (own config, own discovery
# symlink, own sessions) on the shared background service; HOME is left alone
# so the CLI reaches the warm service and ambient auth. Never drive the user's
# live session directories. The caller owns teardown via cleanup.sh.
set -u
REPO="${1:?usage: launch.sh <pstack-repo>}"
[ -d "$REPO" ] || { echo "launch: repo missing: $REPO" >&2; exit 1; }
[ -f "$REPO/dist/src/index.js" ] || { echo "launch: build missing: run pnpm build in $REPO first" >&2; exit 1; }

ROOT="$(mktemp -d /tmp/pstack-verify-XXXXXX)"
export PSTACK_REPO="$REPO"
export PSTACK_RUN_ROOT="$ROOT"
mkdir -p "$ROOT/.opencode/plugins"

printf '{\n  "$schema": "https://opencode.ai/config.json"\n}\n' > "$ROOT/opencode.json"
ln -sfn "$REPO" "$ROOT/.opencode/plugins/pstack"
git -C "$ROOT" init -q 2>/dev/null || true

# Make helpers resolvable inside herdr panes that only inherit env, not PATH.
VERIFY_BIN="$REPO/.agents/skills/verify-pstack/scripts"
case ":$PATH:" in
  *":$VERIFY_BIN:"*) ;;
  *) export PATH="$VERIFY_BIN:$PATH" ;;
esac

echo "$ROOT"
