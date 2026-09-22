#!/usr/bin/env bash
# verify-pstack run — execute one opencode CLI drive inside a verification instance (opencode v2).
# Usage: pstack-verify-run.sh <run-root> --mode <mode> [--model p/m] [--] [args]
# Modes:
#   agents               boot the location via `opencode debug agents` (no model call).
#                        Exit 0 proves the location resolves and its plugins load.
#                        Plugin-added skills NEVER appear in any CLI list in v2;
#                        they are session-scoped, so registration is proved by `run`.
#   skills               dump the file-discovery skill layer via `opencode api skill.list`
#                        (no model call). Documents the discovery layer only: expect the
#                        global skills, and expect poteto-mode to be ABSENT here.
#   run [--model p/m] -- <prompt...>
#                        one headless `opencode run` turn (model call; needs auth).
#                        This is the registration proof: the session merges the
#                        location catalog (plugin skills + tools) with discovery.
# Isolation: the drive cds to <run-root>, so the project directory (its own
# opencode.json, its own .opencode/plugins symlink, its own sessions) is the
# isolation boundary. HOME is deliberately NOT overridden: in v2 the CLI must
# reach the warm background service through the ambient XDG paths, and auth
# comes from the ambient config. An isolated HOME misses the service socket
# and cold-boots a private server per call. Never drive the user's live
# session directories; the run root is always a fresh /tmp project.
# Prints the child command's stdout.
set -u
ROOT="${1:?usage: pstack-verify-run.sh <run-root> --mode <mode>}"
shift
MODE=""
MODEL=""
while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="${2:?}"; shift 2 ;;
    --model) MODEL="${2:?}"; shift 2 ;;
    --) shift; break ;;
    *) break ;;
  esac
done
[ -n "$MODE" ] || { echo "run: --mode required" >&2; exit 1; }
[ -d "$ROOT" ] || { echo "run: run root missing: $ROOT" >&2; exit 1; }

case "$MODE" in
  agents)
    cd "$ROOT" && exec opencode debug agents ;;
  skills)
    cd "$ROOT" && exec opencode api skill.list ;;
  run)
    if [ -n "$MODEL" ]; then
      cd "$ROOT" && exec opencode run --model "$MODEL" "$@"
    else
      cd "$ROOT" && exec opencode run "$@"
    fi ;;
  *)
    echo "run: unknown mode: $MODE (want agents|skills|run)" >&2; exit 2 ;;
esac
