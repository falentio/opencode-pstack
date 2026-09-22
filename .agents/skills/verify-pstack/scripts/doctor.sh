#!/usr/bin/env bash
# verify-pstack doctor — read-only health check for one verification instance (opencode v2).
# Answers: "is this instance worth driving?"
# Usage: doctor.sh <run-root>
#   <run-root> is the RUN_ROOT created by launch.sh (contains opencode.json,
#   .opencode/plugins/pstack, home/).
# Exits 0 when healthy, 1 otherwise. Never starts servers, never writes product state.
# NOTE: v2 has no `debug skill` / `debug agent` commands, and `api skill.list`
# only shows the file-discovery layer — plugin-added skills are session-scoped
# and provable only by a live `run` turn. Doctor therefore checks build,
# linkage, and location boot (model-free); registration itself is proved by
# the skill-live-load feature drive.
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

# 2. Run root loads this checkout's build via discovery symlink (never npm).
[ -L "$ROOT/.opencode/plugins/pstack" ] \
  || fail ".opencode/plugins/pstack symlink missing in $ROOT (relaunch via launch.sh)"
[ "$(readlink "$ROOT/.opencode/plugins/pstack")" = "$PSTACK_REPO" ] \
  || fail "pstack symlink points at $(readlink "$ROOT/.opencode/plugins/pstack"), not $PSTACK_REPO"

# 3. Run root is a git worktree (v2 location services ignore non-project dirs).
git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || fail "$ROOT is not inside a git work tree (relaunch via launch.sh)"

# 4. Live check: the location boots through the real opencode binary.
# A broken plugin package (bad entrypoint, throwing setup) fails the boot visibly.
# First-ever boot of a location may snapshot an empty catalog while services
# still boot, so retry once after a short wait before failing.
TMPDIR_CANDIDATE="${TMPDIR:-/tmp}"
OUT_FILE="$(mktemp "$TMPDIR_CANDIDATE/pstack-doctor-agents-XXXXXX.json")"
trap 'rm -f "$OUT_FILE"' EXIT
attempt=0
while [ "$attempt" -lt 2 ]; do
  if pstack-verify-run.sh "$ROOT" --mode agents >"$OUT_FILE" 2>"$OUT_FILE.err" \
    && grep -q '"id": *"build"' "$OUT_FILE"; then
    break
  fi
  attempt=$((attempt + 1))
  [ "$attempt" -lt 2 ] && sleep 20
done
grep -q '"id": *"build"' "$OUT_FILE" \
  || fail "agents boot probe failed: $(head -c 500 "$OUT_FILE.err") ($(wc -c <"$OUT_FILE") bytes)"

echo "doctor: OK run-root=$ROOT"
