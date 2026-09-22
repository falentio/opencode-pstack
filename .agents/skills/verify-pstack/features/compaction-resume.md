# Compaction resume note

Compaction resume keeps `poteto-mode` active across session compaction: when a session that loaded poteto compacts, the plugin injects a resume note so the post-compaction agent re-invokes the skill instead of continuing from stale instructions.

## Sub-features

- `resume-slash` detects poteto loaded via the `/poteto-mode` slash command.
- `resume-skill-call` detects poteto loaded via the `skill` tool.
- `resume-agent-spawn` detects poteto loaded via a `poteto-agent` task spawn.
- `resume-opt-out` stays silent when the user opted out (opt out, disable, turn off, quit).

## How to get to it (user POV)

- Use `/poteto-mode` in a long session, let the session compact, and observe the resumed agent re-invoke `poteto-mode` before other work.
- The behavior is automatic; there is no button. The user-visible proof is the resume sentence naming the load kind and the session-pickup path.

## Driving it with pstack-verify-run

Preconditions:

- `scripts/doctor.sh "$RUN_ROOT"` exits 0.
- Unit suite passes: `pnpm test` in `$PSTACK_REPO` (the evidence-matching logic is pure and fully covered by `test/poteto-compaction.test.ts`; the live drive below proves the hook is wired, the suite proves the matrix).

- **Unit matrix.** Run `pnpm test -- test/poteto-compaction.test.ts` in `$PSTACK_REPO`. Exit code `0`. This exercises slash/skill-call/agent-spawn detection, opt-out silence, the 300-message cap, and malformed-shape safety.
- **Live wiring.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode run -- "Use the poteto-mode skill, then reply with the single word PSTACK-RESUME-READY."` followed in the same session by a compaction cycle. The post-compaction reply re-invokes `poteto-mode` (assert the resume sentence or a fresh skill load, not a cold continuation). Where headless `opencode run` cannot trigger compaction deterministically, report `verified-unreachable` for the live leg with the attempted command, and let the unit matrix carry the feature.
- **Proof.** Save the unit output to `artifacts/compaction-resume/unit.log` and any live transcript to `artifacts/compaction-resume/live.log`; record which legs ran in `artifacts/compaction-resume/summary.txt`.

## Gotchas

- Compaction is session-lifecycle behavior, not a CLI flag. Do not invent a `--compact` probe; the headless CLI may not expose it. An honest `verified-unreachable` on the live leg beats a fake passing drive.
- The unit suite imports from `src/`, not `dist/`. Pair it with the `plugin-skills` feature (which proves `dist/` is what loads) so the two legs together cover source logic and shipped wiring.
- Opt-out matching is substring-based (`disable`, `quit`, ...). A live prompt containing those words for other reasons can legitimately suppress the note; keep the marker prompt free of them.
- The resume note never contains `# Poteto mode` content itself (it points at it). Assert on the `Re-invoke the poteto-mode skill` sentence and the `session-pickup.md` path, not the full skill body.
