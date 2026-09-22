# Plugin skills registration

Plugin skills registration lets a user install the checkout locally and see every bundled pstack skill in their real opencode session, loaded from the local build rather than npm.

## Sub-features

- `skills-list` lists all 50 bundled skills via the user-facing skill surface.
- `skills-from-build` proves the listing comes from the checkout's `dist/` build, not an npm install.
- `skills-local-config` proves a local per-project `opencode.json` pointing at the checkout path is enough to load them.

## How to get to it (user POV)

- Point a project's `opencode.json` `plugin` entry at the checkout path and run `opencode debug skill` in that project.
- Ask opencode for the `poteto-mode` skill in a session started in that project.

## Driving it with pstack-verify-run

Preconditions:

- `scripts/doctor.sh "$RUN_ROOT"` exits 0.
- `$RUN_ROOT/opencode.json` `plugin` entry equals the checkout path.

- **List skills.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode debug-skill`. Exit code `0` and the JSON output contains `"name": "poteto-mode"`.
- **Count the bundle.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode debug-skill | grep -c '"name":'`. The count equals the number of directories under `<checkout>/skills` plus builtins (50 plugin skills at last count; assert `>= 50` and record the exact number).
- **Prove build origin.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode debug-skill | grep '"location"'`. At least one location starts with `<checkout>/skills/` (e.g. `<checkout>/skills/poteto-mode/SKILL.md`).
- **Prove local config.** Run `cat "$RUN_ROOT/opencode.json"`. The `plugin` array contains exactly the checkout path and no npm spec.
- **Proof.** Save the full `debug-skill` stdout to `artifacts/plugin-skills/list.json` plus a one-line summary (`<count> skills, poteto-mode present, locations under <checkout>/skills`) to `artifacts/plugin-skills/summary.txt`.

## Gotchas

- `opencode debug skill` with no project config prints usage, not the list. The helper cds to `$RUN_ROOT` so opencode loads the local `opencode.json`; invoking `opencode debug skill` anywhere else tests the wrong config.
- A stale `dist/` registers old skill content. Rebuild (`pnpm build`) after any `skills/` change and re-run doctor before asserting.
- Global skills from `~/.agents/skills` also appear in the list. Assert on the `<checkout>/skills` location prefix, not the raw count alone, to prove build origin.
- `HOME` isolation means first runs may be slow (cold cache). Slowness is not failure; only a non-zero exit or missing `poteto-mode` entry fails the drive.
