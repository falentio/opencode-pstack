# Plugin agents registration

The pstack subagents (`poteto-agent`, `comment-sicko`) register from the build-loaded plugin. The opencode v2 agent editor has no `add()`, but `ctx.agent.transform`'s `update(id, fn)` creates the agent when the id is absent, so `debug agents` listing both proves the plugin registered them. The user-visible behavior is: `debug agents` in the verification instance lists both subagents with `mode: subagent`, and no files are copied into the project.

## Sub-features

- `agents-ship` proves both agent files exist and parse with `mode: subagent`, a non-empty description, and a non-empty prompt.
- `agents-injected` proves the build-loaded plugin registers both agents: `debug agents` in the verification instance lists `poteto-agent` and `comment-sicko` with `mode: subagent`.
- `agents-registration-docs` proves the README documents the automatic `ctx.agent.transform` registration and that no files are copied.

## How to get to it (user POV)

- Start a session in the verification instance (its `.opencode/plugins/pstack` symlink loads the build).
- Run `opencode debug agents` and find `poteto-agent` and `comment-sicko` with `mode: subagent`.
- Spawn `poteto-agent` or `comment-sicko` as a subagent in a session started in that project.

## Driving it with pstack-verify-run

Preconditions:

- `scripts/doctor.sh "$RUN_ROOT"` exits 0.

- **Prove the files ship.** Run `node --test test/catalog.test.ts test/plugin.test.ts` in `$PSTACK_REPO`. Exit code `0`. The `agents ship as markdown files` and `the catalog loads skills and markdown agents` cases assert both files parse with `mode: subagent`.
- **Prove injection.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode agents`. Exit code `0`. Assert the output contains the built-in `build` agent AND lists `poteto-agent` and `comment-sicko` with `mode: subagent`: their presence is correct v2 plugin behavior, not fixture leakage.
- **Prove the docs.** Run `grep -n "ctx.agent.transform" README.md` in `$PSTACK_REPO`. Exit code `0` with at least one match stating the plugin registers both subagents and copies no files.
- **Proof.** Save the unit output to `artifacts/plugin-agents/unit.log`, the full `agents` stdout to `artifacts/plugin-agents/agents.json`, and one line (`poteto-agent + comment-sicko register as subagents via ctx.agent.transform, no files copied`) to `artifacts/plugin-agents/summary.txt`.

## Gotchas

- Do not port the v1 `debug-agent --agent <name>` probes: v2 has no such command; use `debug agents` and match on the listed names.
- A missing `poteto-agent` or `comment-sicko` entry in `debug agents` output means the plugin did not register it: rebuild `dist/` and re-run the drive.
- `debug agents` returns `[]` outside a git worktree. The helper cds to `$RUN_ROOT`, which `launch.sh` git-initializes; invoking elsewhere tests the wrong location.
- Rebuild after any `agents/*.md` change: the plugin reads the parsed files at setup, so a stale `dist/` or un-rebuilt checkout proves the old registration.
