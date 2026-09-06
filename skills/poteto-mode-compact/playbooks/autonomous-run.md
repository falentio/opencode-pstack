### Autonomous run

**Own the exit condition. Define done, then drive to it without stopping.** Use this for "going to bed", "run until done", or "/loop until X".

1. State the exit condition as a checkable predicate before the first iteration. Use a concrete result such as tests green, the repro fixed, all N PRs merged, or a zero pixel diff. A vague goal stalls. A predicate lets you stop.
   **Completion criterion.** The predicate is written before iteration 1 and another agent can check whether it is true.
2. Pick the wake mechanism with Cursor's `/loop` command. It is a built-in command, not a pstack skill. If you have an event to watch, such as CI, a merge, or a ref advancing, use a watcher subagent to wake you on that event and use a long time-based heartbeat as the fallback. If you have no event, use a fixed-interval heartbeat sized to when the result is worth rechecking.
   **Completion criterion.** The event or no-event case, wake mechanism, and fallback are recorded before iteration 1 starts.
3. In each iteration, make the smallest change the evidence justifies. Verify the change against the predicate. Commit if the predicate advanced. Discard changes that did not help. Revert belt-and-suspenders changes that might help instead of leaving them in place.
   **Gate.** Sequence the work with the [`principle-sequence-verifiable-units`](../../principle-sequence-verifiable-units/SKILL.md) skill. Verify each unit before starting the next. Do not batch checks at the end.
   **Completion criterion.** The iteration has one evidence-backed change, a predicate check, a commit only when progress occurred, and no unhelpful or speculative change left in place.
4. Own mid-run discoveries. Address broken skills, related bugs, flaky verifiers, review noise, tooling failures, orphaned follow-ups, and fixable drift yourself via poteto-mode. Put out-of-band fixes in their own PR. Do not park reversible work for the human or use `AskQuestion`. Surface only irreversible actions, genuine product or preference calls that no experiment can settle, or a real dead end. Keep the predicate as the main drive and return to it after each side fix.
   **Completion criterion.** Every discovery is handled or classified as an allowed surfaced case. Each out-of-band fix has its own PR. The predicate is rechecked after each side fix.
5. Checkpoint every iteration with the [`show-me-your-work`](../../show-me-your-work/SKILL.md) skill. Add a row for what changed and whether the predicate moved. A run without a trail cannot be audited or resumed.
   **Completion criterion.** The current iteration has a trail row that records the change and whether the predicate moved.
6. Stop when the predicate is met. A plateau is not a stop. Keep going and pivot the approach to push past it. Surface a genuine dead end rather than spinning. Never relax the predicate to declare victory.
   **Completion criterion.** The run ends only when the predicate is met or a genuine dead end is surfaced, and the predicate has not been relaxed.

**Reply.** Include the exit condition, iterations run, what landed, what was discarded, and the final predicate state.
