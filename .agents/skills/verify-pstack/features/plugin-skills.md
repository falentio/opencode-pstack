# Plugin skills registration

Plugin skills registration makes every bundled pstack skill visible to sessions in a project that loads the checkout from build. In opencode v2, plugin-added skills are session-scoped: they reach the model inside a session, and no CLI list command shows them. Registration is therefore proved by a unit drive plus a live session drive, never by dumping a list.

## Sub-features

- `skills-bundle` proves `setup()` registers the full bundle (50 skills including `poteto-mode`) from the checkout's `dist/` build.
- `skills-session-scope` proves a real headless session sees and loads `poteto-mode` from the build-loaded plugin.
- `skills-discovery-layer` documents that `api skill.list` shows only the file-discovery layer (globals), where `poteto-mode` must be absent; a drive that asserts on that list alone is a false proof.

## How to get to it (user POV)

- Load the checkout in a project (symlink it under `.opencode/plugins/` or install the published package) and start a session there.
- Ask the session for the `poteto-mode` skill and watch it load the playbook.

## Driving it with pstack-verify-run

Preconditions:

- `scripts/doctor.sh "$RUN_ROOT"` exits 0.
- `pnpm build` is fresh in `$PSTACK_REPO` (the plugin loads from `dist/`, never npm).

- **Prove the bundle.** Run `node --test test/plugin-setup.test.ts` in `$PSTACK_REPO`. Exit code `0`. The `v2 setup registers the skill bundle from build` case asserts 50+ skills including `poteto-mode` with a `path` under `<checkout>/skills` and the real `SKILL.md` body.
- **Prove session scope.** Run the `skill-live-load` feature drive on the same `$RUN_ROOT`. Its `PSTACK-VERIFY-OK` marker is the session-scope proof; record the run root and checkout revision with it.
- **Document the discovery layer.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode skills`. Exit code `0`. Assert `poteto-mode` is absent from the output: the discovery layer legitimately lacks plugin skills in v2, so presence here would mean the fixture is testing the wrong layer.
- **Proof.** Save the unit output to `artifacts/plugin-skills/unit.log`, the discovery dump to `artifacts/plugin-skills/discovery.json`, and one line (`<n> bundled skills via setup, live marker <run-root>@<rev>, discovery layer has no poteto-mode`) to `artifacts/plugin-skills/summary.txt`.

## Gotchas

- There is no v2 equivalent of `opencode debug skill`. Any recipe that dumps a skill list and greps for `poteto-mode` tests the discovery layer, not the plugin; it fails closed (absent) on a healthy instance.
- A stale `dist/` registers old skill content. Rebuild (`pnpm build`) after any `skills/` change and re-run doctor before asserting.
- The location must boot for `setup()` to run at all. Doctor's `agents` probe boots it; if the live drive runs on a fresh root, run the `agents` probe first so a cold-boot race cannot masquerade as missing registration.
- First runs against the shared service may be slow (cold location boot). Slowness is not failure; only a non-zero exit or a missing marker fails the drive.
