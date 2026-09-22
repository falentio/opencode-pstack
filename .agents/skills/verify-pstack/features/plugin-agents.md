# Plugin agents shipment

The pstack subagents (`poteto-agent`, `comment-sicko`) ship as markdown files in the checkout's `agents/` directory for file-based install. The opencode v2 plugin API exposes no agent `add()` — a plugin can update, remove, or set the default agent, but it cannot inject new ones — so unlike v1 there is no auto-registration to resolve through a debug command. The user-visible behavior is: the files exist, they parse as `subagent` definitions, the README tells the user where to put them, and the plugin does not (cannot) inject agents of its own.

## Sub-features

- `agents-ship` proves both agent files exist and parse with `mode: subagent`, a non-empty description, and a non-empty prompt.
- `agents-not-injected` proves the build-loaded plugin adds no agents of its own: `debug agents` in the verification instance lists only the built-ins.
- `agents-install-docs` proves the README documents the file-based install path (`.opencode/agents/`).

## How to get to it (user POV)

- Copy (or symlink) `agents/*.md` from the checkout into the project's `.opencode/agents/` directory and list agents in that project.
- Spawn `poteto-agent` or `comment-sicko` as a subagent in a session started in that project.

## Driving it with pstack-verify-run

Preconditions:

- `scripts/doctor.sh "$RUN_ROOT"` exits 0.

- **Prove the files ship.** Run `node --test test/catalog.test.ts test/plugin.test.ts` in `$PSTACK_REPO`. Exit code `0`. The `agents ship as markdown files` and `the catalog loads skills and markdown agents` cases assert both files parse with `mode: subagent`.
- **Prove no injection.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode agents`. Exit code `0`. Assert the output contains the built-in `build` agent and does NOT contain `poteto-agent`: in v2 the absence is correct plugin behavior, not a gap.
- **Prove the docs.** Run `grep -n "opencode/agents" README.md` in `$PSTACK_REPO`. Exit code `0` with at least one match pointing at the `agents/` install path.
- **Proof.** Save the unit output to `artifacts/plugin-agents/unit.log`, the full `agents` stdout to `artifacts/plugin-agents/agents.json`, and one line (`poteto-agent + comment-sicko ship as subagent files, no agent injection, docs point at .opencode/agents/`) to `artifacts/plugin-agents/summary.txt`.

## Gotchas

- Do not port the v1 `debug-agent --agent <name>` probes: v2 has no such command, and resolving an agent by name would only prove file-based install, never plugin behavior.
- A `poteto-agent` entry in `debug agents` output inside a verification instance means the fixture leaked (e.g. a global agent file), not that the plugin registered it. Treat presence as a failed negative control.
- `debug agents` returns `[]` outside a git worktree. The helper cds to `$RUN_ROOT`, which `launch.sh` git-initializes; invoking elsewhere tests the wrong location.
- Rebuild after any `agents/*.md` change is unnecessary for shipment (files ship as-is), but re-run the unit drive: the catalog parser validates them.
