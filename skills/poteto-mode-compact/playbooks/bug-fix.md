### Bug fix

**You own this task. Plan, review, and verify.** Delegate investigation and the fix to subagents, but stay in the lead.

Be scientific. Every shipped line must trace to runtime evidence. Treat a belt-and-suspenders change that "might help" as a hypothesis, not a fix, so it does not ship. When evidence refutes a hypothesis, revert the change it motivated. Ship only the smallest change the evidence justifies. Apply the same discipline to Perf, where the evidence is the trace.

1. Reproduce the bug yourself on the matching surface through the control skill required by [Mandatory gates](../SKILL.md#mandatory-gates). Do not hand the repro to the user. A debug or instrumentation protocol that tells you to ask the user does not override this. Drive the instrumented runtime yourself. Ask the user only when the control surface cannot reach the target, only after you have driven it as far as it goes, and only with a stated, specific reason. If direct reproduction fails, synthesize the trigger, tighten the conditions, or add instrumentation until it fires. A bug you cannot reproduce cannot be proved fixed.
   **Completion criterion.** Continue only after the original trigger fires on the matching surface and the failing repro output is captured. If the control surface cannot reach the target after these attempts, stop and ask the user with the specific reason. This step has not passed.

2. Binary-search the cause. Form candidate hypotheses and rule them out until one survives. Fan out [how](../../how/SKILL.md) and [why](../../why/SKILL.md) as parallel subagents for the investigation. Use how to inspect the affected subsystem and why to inspect regression history. At each pass, take the split that cuts the most remaining problem space, get runtime evidence, and eliminate hypotheses. When program state is unclear, add instrumentation or logging and read it as the code runs. Do not guess. Drive a long or stubborn hunt with Cursor's `/loop` command. Confirm the surviving mechanism with runtime evidence before the step 3 architect or interrogate fan-out. A plausible but unconfirmed cause can make the architect and interrogate reviews unanimously wrong while the real cause sits one subsystem over.
   **Completion criterion.** The candidate list records runtime evidence for every eliminated hypothesis and one surviving mechanism. The surviving mechanism is confirmed before step 3 begins.

3. Plan the fix. If it crosses a function boundary, run [architect](../../architect/SKILL.md) first. If the design is contested, run [interrogate](../../interrogate/SKILL.md) before implementation. Delegate implementation to a subagent on the inherited parent model with a specific scope. Omit `Task.model`. Review the diff yourself.
   **Completion criterion.** The plan is recorded. Every required design review ran before implementation. The delegate has a specific scope and inherited parent model, `Task.model` is omitted, and your diff review is complete.

4. Verify the fix on the same surface. Re-run the original repro. Treat an inconclusive or wrong-surface result as a failure, flag it, and do not call it a pass. Use unit tests to show branch behavior, not bug absence.
   **Completion criterion.** The original repro passes on the same surface with output captured. No inconclusive or wrong-surface result is reported as a pass.

5. Stage commits so the failing repro lands before the fix in git history. Make the diff tell the story. When a cheap local test path exists, follow the failing-test-first cadence in [tdd](../../tdd/SKILL.md). Skip it when the test is expensive, integration-heavy, or unclear. [sequence-verifiable-units](../../principle-sequence-verifiable-units/SKILL.md) is the canonical principle here. Put the failing test first and the fix on top.
   **Completion criterion.** Git history shows the failing repro before the fix, the diff tells the story, and the tdd choice is either applied for a cheap local path or explicitly skipped for an expensive, integration-heavy, or unclear test.

6. Run [Opening a PR](opening-a-pr.md).
   **Completion criterion.** The [Opening a PR](opening-a-pr.md) procedure has run.

**Reply.** State what was broken, the root cause, the fix, and how you verified it. Paste the failing-then-passing repro output verbatim.
