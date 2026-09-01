#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_PATH="$ROOT"
SCRATCH="$(mktemp -d /tmp/oc-verify.XXXXXX)"
PORT="${PORT:-43991}"
LOG="$SCRATCH/serve.log"

cleanup() {
  test -f "$SCRATCH/serve.pid" && kill "$(cat "$SCRATCH/serve.pid")" 2>/dev/null || true
  rm -rf "$SCRATCH"
}
trap cleanup EXIT

cat > "$SCRATCH/opencode.json" << EOF
{
  "plugin": ["$PLUGIN_PATH"]
}
EOF

export OPENCODE_SERVER_PASSWORD=""
cd "$SCRATCH"

opencode serve --port "$PORT" >"$LOG" 2>&1 &
echo $! > "$SCRATCH/serve.pid"

for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:$PORT/agent" >/dev/null 2>&1; then break; fi
  sleep 1
done

SKILLS="$(curl -sf "http://127.0.0.1:$PORT/skill")"
AGENTS="$(curl -sf "http://127.0.0.1:$PORT/agent")"

expected_skills='poteto-mode make-bot-ui how unslop principle-laziness-protocol setup-pstack'
missing_skills=""
for s in $expected_skills; do
  if ! echo "$SKILLS" | grep -q "\"name\":\"$s\""; then
    missing_skills="$missing_skills $s"
  fi
done

expected_agents='poteto-agent comment-sicko'
missing_agents=""
for a in $expected_agents; do
  if ! echo "$AGENTS" | grep -q "\"name\":\"$a\""; then
    missing_agents="$missing_agents $a"
  fi
done

installed_files_ok=1
for s in $expected_skills; do
  if [ ! -f "$ROOT/skills/$s/SKILL.md" ]; then installed_files_ok=0; fi
done

echo "--- results ---"
echo "skills found: $(echo "$SKILLS" | grep -o '"name":"[^"]*"' | wc -l)"
echo "agents found: $(echo "$AGENTS" | grep -o '"name":"[^"]*"' | wc -l)"
echo "missing skills:${missing_skills:- none}"
echo "missing agents:${missing_agents:- none}"
echo "installed skills on disk: $([ "$installed_files_ok" = 1 ] && echo ok || echo MISSING)"

if [ -n "$missing_skills$missing_agents" ] || [ "$installed_files_ok" != 1 ]; then
  echo "--- server log tail ---"
  tail -5 "$LOG"
  exit 1
fi

echo "VERIFY PASS"