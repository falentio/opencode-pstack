# pstack verification map

This directory is the maintained source for verifying the user-facing behavior of the opencode-pstack plugin. Read the index before driving an instance, then use the matching feature file as the recipe.

## Baseline preconditions

- `pnpm build` passes in the checkout under test; the plugin loads from `dist/`, never npm.
- Launch one run root per verification run via `scripts/launch.sh <pstack-repo>`; the run root is git-initialized and holds a minimal per-project `opencode.json` plus a `.opencode/plugins/pstack` symlink to the checkout (v2 loads local plugins through discovery, never a config path entry).
- Export `PSTACK_REPO=<checkout>` and `PATH=<checkout>/.agents/skills/verify-pstack/scripts:$PATH` so `doctor.sh` and `pstack-verify-run.sh` resolve.
- Run `scripts/doctor.sh <run-root>` and require exit 0 before the first drive.
- All drives go through herdr panes in one tab named `pstack-verify-<id>`; one writer per run root.
- Never drive an instance that was not started by this verification run.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer stable handles (`poteto-mode`, `poteto-agent`, `comment-sicko`) over output position or timing.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run build steps through `herdr pane run` in the build pane; run probes through `pstack-verify-run.sh <run-root> --mode <mode>`.
- Restore nothing: drives are read-only except artifact writes. Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final verdict.
- CLI proof includes the command, stdout, stderr, and exit code, saved to `artifacts/<feature>/<drive>.log`.
- Registration proof is the unit bundle count plus the live-session marker line (v2 has no CLI list of plugin skills).
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with pstack-verify-run` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Plugin skills registration](./plugin-skills.md) covers the bundled skills reaching sessions from the build-loaded plugin (unit bundle proof plus live-session proof; v2 has no CLI list of plugin skills).
- [Plugin agents shipment](./plugin-agents.md) covers both subagent files shipping with `subagent` mode plus install docs (v2 plugins cannot inject agents, so shipment — not resolution — is verified).
- [Skill load in a live session](./skill-live-load.md) covers one headless `opencode run` turn invoking `poteto-mode` end to end.
- [Compaction resume note](./compaction-resume.md) covers the poteto resume context surviving session compaction in a live session.
