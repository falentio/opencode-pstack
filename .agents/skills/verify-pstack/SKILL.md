---
name: verify-pstack
description: "Drive the opencode-pstack plugin the way a user does: build from source, load from build via local per-project config, and prove skills and agents register in a real opencode session. Use when verifying plugin changes, testing skill or agent registration, or proving a release."
---

# Verify pstack

Drive the real plugin through the real `opencode` CLI. Shell assertions on
`dist/` alone are not a plugin proof.

## 1. Launch

Each verification run owns one isolated instance. Never drive the user's live
session and never reuse another run's directories.

```bash
VERIFY=.agents/skills/verify-pstack
export PATH="$PWD/$VERIFY/scripts:$PATH"
export PSTACK_REPO="$PWD"
RUN_ROOT="$("$VERIFY/scripts/launch.sh" "$PSTACK_REPO")"
```

`launch.sh` creates `$RUN_ROOT` under `/tmp/pstack-verify-*` containing a local
per-project `opencode.json` whose `plugin` entry is the checkout path (loaded
from build, never npm) plus an empty `home/` used as isolated `HOME`. Record
`$RUN_ROOT`. All drives below run with cwd=`$RUN_ROOT` and `HOME=$RUN_ROOT/home`.

Readiness: `launch.sh` printing `$RUN_ROOT` with `opencode.json` inside is ready.
There is no server to wait for; drives are short-lived CLI invocations.

Teardown (always, including after failed iterations):

```bash
"$VERIFY/scripts/cleanup.sh" "$RUN_ROOT"
```

Cleanup removes the run root and any `opencode serve` child it started. It never
removes evidence: proof artifacts live in `$VERIFY/artifacts/<feature>/` inside
the repo, outside every run root. Confirm evidence files still exist after cleanup.

## 2. Doctor

Run first whenever anything looks off, and before the first drive of a run:

```bash
"$VERIFY/scripts/doctor.sh" "$RUN_ROOT"
```

Doctor is read-only. It checks the build artifacts exist (`dist/src/index.js`,
`dist/src/catalog.js`), the run config references the local checkout (not npm),
and the `poteto-mode` skill plus `poteto-agent` resolve through the real
`opencode` binary. Exit `0` means worth driving. On failure, fix the cause
(stale build: `pnpm build`; wrong config: relaunch) and re-run doctor once
before calling the pass blocked.

## 3. Drive

All driving goes through herdr panes so the CLI control survives tool-call
boundaries. One herdr tab per verification run, named `pstack-verify-<id>`.
One drive per pane where panes are the unit for interactive sessions; the
short-lived `opencode debug` / `opencode run` probes below need no PTY and run
via `herdr pane run` in a scratch pane, each with explicit `$RUN_ROOT`.

Build once per run, in its own pane (this is the build the plugin loads from):

```bash
herdr tab create --workspace <ws> --label "pstack-verify-<id>" --no-focus
herdr pane split <pane> --direction right --no-focus   # parse result.pane.pane_id
herdr pane run "$BUILD_PANE" "pnpm build"
herdr pane wait-output "$BUILD_PANE" --match "tsc" --timeout 120000
```

Then one pane per feature drive (feature files name the exact probe). Canonical
probes, each executed as `herdr pane run "$PANE" "<cmd>"`:

- **Skills registration:** `pstack-verify-run.sh "$RUN_ROOT" --mode debug-skill`
  (the helper cds to `$RUN_ROOT` so opencode picks up the local `opencode.json`)
  and assert the JSON lists `poteto-mode` (currently 50 plugin skills + builtins).
- **Agents registration:** `pstack-verify-run.sh "$RUN_ROOT" --mode debug-agent --agent poteto-agent`
  and `--agent comment-sicko`; each must return its `name` and `"mode": "subagent"`.
- **Live skill load:** `pstack-verify-run.sh "$RUN_ROOT" --mode run -- "Use the poteto-mode skill, then reply with the single word PSTACK-VERIFY-OK."`
  (model call; needs auth; assert the reply word appears in output). The helper
  cds to `$RUN_ROOT`; never pass `--dir` yourself.

Prefer the stable handles the feature map names (`poteto-mode`, `poteto-agent`,
`comment-sicko`) over output position or timing. Never double-drive a shared
run root from two panes at once: one writer per `$RUN_ROOT`.

## 4. Evidence

Capture the action and the resulting state, not just the final screen:

- CLI proof is the command plus stdout, stderr, and exit code. Save each drive's
  full output to `$VERIFY/artifacts/<feature>/<drive>.log` and quote the
  asserting lines in the verdict, not a paraphrase.
- Registration proof additionally records the skill count and both agent names.
- A live-drive proof records the prompt sent and the reply's asserting line.
- Name the feature ID and entry point with every artifact.

Proof standards: exercise the real user path (`opencode debug skill`, `opencode
debug agent`, `opencode run` against the local-config instance), never an
in-repo unit test or a direct `node dist/` import. A green `pnpm test` alone is
not a plugin proof. When a drive fails, save the failing log first, then fix,
rebuild, and re-drive the same probe; show before and after.

## 5. Cleanup

After the last drive (including re-proofs), run cleanup for every run root the
run created, then confirm proof artifacts survive at their named paths:

```bash
"$VERIFY/scripts/cleanup.sh" "$RUN_ROOT"
ls "$VERIFY/artifacts/<feature>/"
```

Never kill by process name; cleanup kills only the recorded serve PID when one
exists. Failed-iteration residue (run roots, panes) is removed whether the
drive exited, stuck, or timed out: close panes you started with
`herdr pane close <pane>` after reading their final output.

## 6. Helpers

Scripts in `scripts/` are executable and invoked as shown in this body:

- `launch.sh <pstack-repo>` prints `$RUN_ROOT`.
- `doctor.sh <run-root>` read-only health check, exit 0/1.
- `pstack-verify-run.sh <run-root> --mode debug-skill | debug-agent --agent N | run -- <prompt...>`
  single entry point for every drive.
- `cleanup.sh <run-root>` removes the run root and its serve child, never evidence.

All four require `PSTACK_REPO` (repo checkout) for build/config assertions and
assume `opencode`, `node`, and `herdr` on `PATH`. A helper the reader has to
reverse-engineer is not a helper; invocations above are literal.

## 7. Feature map

`features/README.md` is the maintained verification source. Read its index
before driving, then use the matching feature file as the recipe. A proof that
drives one convenient entry point is incomplete when the map lists others. Keep
the map honest with the maintain-verification-skill skill.
