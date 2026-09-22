# Plugin agents registration

Plugin agents registration lets a user reach both pstack subagents (`poteto-agent`, `comment-sicko`) in a real opencode session after installing the checkout locally from build.

## Sub-features

- `agents-resolve` resolves each bundled subagent by name through the user-facing agent surface.
- `agents-subagent-mode` proves each registers as `"mode": "subagent"`, the only mode this plugin uses.
- `agents-from-build` proves the agent prompt content matches the checkout's `agents/*.ts` sources.

## How to get to it (user POV)

- Point a project's `opencode.json` `plugin` entry at the checkout path and run `opencode debug agent <name>` in that project.
- Spawn `poteto-agent` or `comment-sicko` as a subagent in a session started in that project.

## Driving it with pstack-verify-run

Preconditions:

- `scripts/doctor.sh "$RUN_ROOT"` exits 0.
- `$RUN_ROOT/opencode.json` `plugin` entry equals the checkout path.

- **Resolve poteto-agent.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode debug-agent --agent poteto-agent`. Exit code `0` and the JSON contains `"name": "poteto-agent"` and `"mode": "subagent"`.
- **Resolve comment-sicko.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode debug-agent --agent comment-sicko`. Exit code `0` and the JSON contains `"name": "comment-sicko"` and `"mode": "subagent"`.
- **Prove build origin.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode debug-agent --agent poteto-agent`. The output references the checkout build (agent permission patterns or prompt text matching `agents/poteto-agent.ts`).
- **Negative control.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode debug-agent --agent no-such-agent`. The command reports the agent as not found; this proves name resolution is real and not a static dump.
- **Proof.** Save each `debug-agent` stdout to `artifacts/plugin-agents/<name>.json` and record both names plus modes in `artifacts/plugin-agents/summary.txt`.

## Gotchas

- `opencode debug agent` with no name prints usage. The `--agent N` flag on the helper is required; it is not optional.
- Agent output is long (permission patterns per skill). Assert with `grep` on `"name"` and `"mode"`, and save the full JSON rather than quoting it whole.
- A missing agent is a lookup failure, not a crash: expect a "not found" message with exit 0. Treat any output containing the requested name as a failed negative control.
- Rebuild after any `agents/*.ts` change; the catalog compiles agent prompts into `dist/` and stale builds register stale prompts.
