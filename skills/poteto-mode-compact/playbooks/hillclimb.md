### Hillclimb

**Own the metric and the experiment's integrity. Supervise and review. Delegate the attempts.** Use this playbook for sustained, iterative improvement of one measurable thing against a target. Examples include "hillclimb on X", "make startup 50% faster", "systematically drive down <metric>", and "keep trying until <metric> improves by N%". Use [Bug fix](bug-fix.md) or [Perf issue](perf-issue.md) for a one-off fix.

**Core discipline.** Make one change and one measurement, then keep or revert the change. Stack only tested changes. Claim a win only from measurement, never from code inspection. Let the data decide. Apply the [**principle-prove-it-works**](../../principle-prove-it-works/SKILL.md) skill.

1. Ground the workload and architecture before choosing the ruler. Run [**how**](../../how/SKILL.md) over the target. Name the realistic workload dimensions that can move the result, including data size, history, state, and concurrency. Select a case that reproduces the user's complaint. If no case reproduces it, fix the reproduction before hillclimbing. Choose one metric, the direction that counts as better, and a checkable stop predicate. Pair the target with a floor on attempts so a lucky early win cannot end the run. For example, require at least 50% better than baseline and at least 10 iterations. Use the user's numbers when they are given. Otherwise, agree on the numbers before proceeding.

   **Completion criterion.** The workload, architecture model, complaint reproduction, one metric, better direction, and stop predicate are recorded. The predicate has both a target and a minimum attempt count. A failed reproduction has been fixed and rerun before the search continues.

2. Build the measurement harness, prove its sensitivity, then freeze it with the [**principle-build-the-lever**](../../principle-build-the-lever/SKILL.md) skill. Run contrasting realistic workloads. Confirm that the target case reproduces the symptom and that easier cases separate as expected. If the ruler cannot distinguish them, revise the workload or metric and repeat the sensitivity check. Once frozen, use one repeatable command that emits the metric. Sample enough runs to clear the noise by using the median of N, not a single run. A harness change invalidates every earlier number. Record the baseline metric and a green run of the regression gate before making any change. The gate contains the tests that must keep passing.

   **Completion criterion.** The frozen harness has one repeatable metric command, separates the target and easier workloads, and uses a noise-clearing sample such as the median of N. The baseline and green regression gate are recorded. No change has started before this record exists.

3. Open the decision log with the [**show-me-your-work**](../../show-me-your-work/SKILL.md) skill. Create `decision.tsv` with one row per attempt. Include `id`, `hypothesis`, `change`, `before`, `after`, `delta`, `tests`, `verdict` with `kept` or `reverted`, and `note`. Use the log as the run's memory. Read it before each attempt so the search accumulates instead of circling. Keep it out of the tree and gitignore it so it survives reverts.

   **Completion criterion.** `decision.tsv` exists outside the tree, is gitignored, has every required field, and records exactly one row for every completed attempt.

4. Ground each hypothesis in the architecture model from step 1. Name a specific mechanism and its expected effect, such as "defer X off the boot path because it blocks first paint". Write a mechanism-based hypothesis instead of a vague idea such as "try memoizing something".

   **Completion criterion.** The next hypothesis names a mechanism, ties it to the step 1 architecture model, and states the expected effect. It is not a generic tactic.

5. Loop with one hypothesis per iteration.
   - Hand each change to a subagent on the inherited parent model with a tight scope. Omit `Task.model`. Supervise and review the diff instead of typing the change. Apply the [**principle-guard-the-context-window**](../../principle-guard-the-context-window/SKILL.md) skill.
   - When several independent hypotheses are live, fan them out to parallel subagents. Give each subagent its own worktree so the changes cannot collide. Apply the [**principle-separate-before-serializing-shared-state**](../../principle-separate-before-serializing-shared-state/SKILL.md) skill.
   - Measure before and after with the frozen harness. Run the regression gate.
   - Accept a change only when the metric moves past noise and the gate stays green. Otherwise, revert the change in full. A tweak that might help does not ride along.
   - Make one commit per accepted fix. Stage only the files you changed with `git add <files>`. Never use `-A`. Log the row either way, as kept or reverted.

   Each iteration ends in a check before the next begins. If the run is unattended, borrow only the wake mechanism from the [Autonomous run playbook](autonomous-run.md), not its stop rule. This playbook's stop criteria govern the run. A plateau means pivot, not stop. Apply the [**principle-sequence-verifiable-units**](../../principle-sequence-verifiable-units/SKILL.md) skill.

   **Completion criterion.** The finished iteration has a reviewed diff, frozen before and after measurements, a regression result, a full keep or revert outcome, the required commit state, and one decision-log row. The next iteration starts only after all of those checks pass. An unattended run uses only the linked playbook's wake mechanism and keeps this playbook's stop criteria.

6. Push past the first plateau. After a stall or several rejects in a row, pivot category, combine near-misses, re-read the source, or try something more radical before concluding that the hill is climbed. Correctness and simplicity outrank the number. Revert a win that breaks behavior. Keep a simplification that holds the number. Apply the [**principle-laziness-protocol**](../../principle-laziness-protocol/SKILL.md) skill.

   **Completion criterion.** No plateau is treated as the end until the search has taken a new direction through a category pivot, combined near-misses, a source reread, or a more radical idea. Every kept result preserves behavior, and every simplification that holds the number remains eligible to keep.

7. Stop when the predicate is met, or when the remaining ideas are genuinely marginal and not worth their cost. Keep the predicate unchanged when deciding to stop. Continue while cheap untried hypotheses remain. If you are stuck, record and report the stuck state instead of spinning.

   **Completion criterion.** The stop record names either a satisfied predicate or each remaining idea judged marginal with its cost. No cheap untried hypothesis remains. A stuck run is explicitly recorded and reported.

8. Run [**Opening a PR**](opening-a-pr.md) with the accepted commits stacked in the order they landed. Make the metric's climb readable from top to bottom.

   **Completion criterion.** The Opening a PR run is complete, and every accepted commit appears in landing order so the metric improvement reads from top to bottom.

**Reply:** Report the metric and target, the baseline to final value with the percent delta, the iterations run with kept and reverted counts, each accepted fix on one line, the `decision.tsv` path, and the best idea to try next if pushed further.
