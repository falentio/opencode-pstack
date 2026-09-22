# Skill load in a live session

Skill load in a live session lets a user invoke `poteto-mode` (or the `poteto-mode` skill) in a real session and get the agent behavior the plugin promises, not just a registered name. In opencode v2 this drive is the primary registration proof: plugin-added skills are session-scoped, so a headless `opencode run` turn that loads `poteto-mode` from the build-loaded plugin is the only end-to-end evidence that registration works.

## Sub-features

- `live-invoke` runs one headless turn that loads the `poteto-mode` skill and replies.
- `live-marker` proves the reply came from the loaded skill via an exact marker word.
- `live-local-config` proves the live turn ran under the local discovery symlink (build-loaded plugin).

## How to get to it (user POV)

- Start opencode in a project that loads the checkout (`.opencode/plugins/` symlink or installed package), invoke `/poteto-mode`, and read the reply.
- Run one headless turn with `opencode run` in that project asking for the skill by name.

## Driving it with pstack-verify-run

Preconditions:

- `scripts/doctor.sh "$RUN_ROOT"` exits 0.
- Model auth comes from the ambient config (drives run on the shared service, no HOME isolation). If the ambient default model is inaccessible, pin `--model` explicitly; without any usable auth, report `verified-unreachable` with the auth error instead of a plugin failure. This is the only feature that needs a model call.
- The `plugin-skills` unit drive already passes on this checkout (bundle before invocation).

- **Invoke the skill.** Run `pstack-verify-run.sh "$RUN_ROOT" --mode run --model <provider/model> -- "Use the poteto-mode skill, then reply with the single word PSTACK-VERIFY-OK."`. Exit code `0`. Pin `--model` explicitly: the ambient default model may be inaccessible (tier/gateway), and a model error must not masquerade as a plugin failure.
- **Assert the marker.** The stdout contains `PSTACK-VERIFY-OK` exactly. A reply about poteto without the marker is not proof; re-drive once before failing.
- **Prove local config.** The drive ran with cwd=`$RUN_ROOT` (the helper cds there), and `readlink $RUN_ROOT/.opencode/plugins/pstack` equals the checkout, so the only `poteto-mode` visible is the build-loaded one. Record `$RUN_ROOT` and the checkout revision (`git -C "$PSTACK_REPO" rev-parse --short HEAD`) with the artifact.
- **Proof.** Save full stdout to `artifacts/skill-live-load/run.log` plus stderr/exit code in `artifacts/skill-live-load/run.meta`, and the marker line in `artifacts/skill-live-load/summary.txt`.

## Gotchas

- This is the only feature that spends model tokens and needs provider auth. `agents` and `skills` modes never call a model; run those first so a dead model config cannot masquerade as a plugin failure.
- Headless `opencode run` may print progress lines around the reply. Assert with `grep PSTACK-VERIFY-OK`, not whole-output equality.
- Timeouts are ambiguous (model vs plugin). On timeout, run doctor again: a passing doctor points at the model/transport, not the plugin.
- Do not seed the prompt with skill content. The prompt names the skill only; the plugin must supply the body.
- Rogue-model risk: a weak model may explore the filesystem instead of reading `<available_skills>`. A transcript full of `Glob`/`find` calls with no skill load is a model failure, not a plugin failure; re-drive once with a stronger model before failing.
