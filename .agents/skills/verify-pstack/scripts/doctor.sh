#!/usr/bin/env bash
# verify-pstack doctor — read-only health check for one verification instance.
# Answers: "is this instance worth driving?"
# Usage: doctor.sh <run-root>
#   <run-root> is the RUN_ROOT created by launch.sh (contains opencode.json, home/).
# Exits 0 when healthy, 1 otherwise. Never starts servers, never writes product state.
set -u
ROOT="${1:?usage: doctor.sh <run-root>}"
fail() { echo "doctor: FAIL: $*" >&2; exit 1; }

[ -d "$ROOT" ] || fail "run root missing: $ROOT"
[ -f "$ROOT/opencode.json" ] || fail "opencode.json missing in $ROOT"
command -v opencode >/dev/null 2>&1 || fail "opencode not on PATH"
command -v node >/dev/null 2>&1 || fail "node not on PATH"

# 1. Build is present (plugin loads from build, not npm).
for f in "$PSTACK_REPO/dist/src/index.js" "$PSTACK_REPO/dist/src/catalog.js"; do
  [ -f "$f" ] || fail "build artifact missing: $f (run pnpm build in $PSTACK_REPO)"
done

# 2. Local per-project config points at this checkout's build (not npm).
grep -q "\"$PSTACK_REPO\"" "$ROOT/opencode.json" \
  || fail "opencode.json does not reference local checkout $PSTACK_REPO"

# 3. Live check: plugin registers skills + agents through the real opencode binary.
# NOTE: `debug skill` output is large (~250KB with full skill bodies). Always
# redirect to a temp file first: piping through $() truncates the stream and
# command substitution also swallows the non-zero exit. Never capture inline.
TMPDIR_CANDIDATE="${TMPDIR:-/tmp}"
OUT_FILE="$(mktemp "$TMPDIR_CANDIDATE/pstack-doctor-skills-XXXXXX.json")"
AGENT_FILE="$(mktemp "$TMPDIR_CANDIDATE/pstack-doctor-agent-XXXXXX.json")"
trap 'rm -f "$OUT_FILE" "$AGENT_FILE"' EXIT
pstack-verify-run.sh "$ROOT" --mode debug-skill >"$OUT_FILE" 2>"$OUT_FILE.err" \
  || fail "debug-skill probe failed: $(head -c 500 "$OUT_FILE.err")"
grep -q '"name": *"poteto-mode"' "$OUT_FILE" \
  || fail "poteto-mode skill missing from debug output ($(wc -c <"$OUT_FILE") bytes)"
pstack-verify-run.sh "$ROOT" --mode debug-agent --agent poteto-agent >"$AGENT_FILE" 2>"$AGENT_FILE.err" \
  || fail "debug-agent probe failed: $(head -c 500 "$AGENT_FILE.err")"
grep -q '"name": *"poteto-agent"' "$AGENT_FILE" \
  || fail "poteto-agent missing from debug output"

echo "doctor: OK run-root=$ROOT"
