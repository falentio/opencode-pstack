### Feature

**Own the design.** Plan, review, and verify. Delegate implementation and stay in the lead.

1. Run [`how`](../../how/SKILL.md) over the affected subsystem. **Done when** you have traced the affected flow and recorded its relevant files.
2. Run [`architect`](../../architect/SKILL.md) for parallel design exploration. If you skip it, record `architect skipped: <reason>`. Keep the design decision explicit instead of folding it silently into implementation. **Done when** the architecture result or the exact skip record is present.
3. Write the throughput checkpoint as four todo items before fan-out. Keep every dimension that genuinely does not apply, including a single file or no fan-out, with `n/a: <reason>` instead of dropping it.
   - **Blocking first steps.** Run gates before fan-out. **Check** every gate appears before fan-out.
   - **Independent workstreams.** Parallelize disjoint files, services, or layers. Serialize shared writes. **Check** every workstream is marked parallel or serialized for its ownership pattern.
   - **Shared mutable state.** Default to splitting the target. Apply [`separate-before-serializing-shared-state`](../../principle-separate-before-serializing-shared-state/SKILL.md). Serialize only for real invariants. **Check** the target is split unless a real invariant requires one shared writer.
   - **Smallest safe decomposition.** If one worker is best, name why. **Check** the todo item names the reason when one worker is chosen.
   **Done when** the todo list has all four items, every dimension has a rule or `n/a: <reason>`, and every gate appears before fan-out.
4. Delegate code-writing to a subagent on the inherited parent model. Give it a specific scope with file paths, a named data shape, the organizing structure for that shape, and success criteria. Choose the organizing structure before the delegate writes logic. Use a state machine over scattered booleans, a table or registry over branching, or a typed model over repeated shape assumptions, following [`principle-model-the-domain`](../../principle-model-the-domain/SKILL.md). Omit `Task.model` and review the diff yourself.
   - If the implementation admits multiple valid shapes, including error handling, an abstraction layer, or test structure, use [`arena`](../../arena/SKILL.md) instead so its runners surface the alternatives and its cross-judge guards the choice. **Check** the alternatives and the cross-judge choice are recorded.
   - Delegation is mandatory. Use no skip-with-reason escape. [`principle-laziness-protocol`](../../principle-laziness-protocol/SKILL.md) does not override this rule. The gain is review separation, not lines saved. **Check** a subagent owns the scoped work.
   - You can spawn a subagent even though you are one. "The app is small" and "a subagent cannot spawn one" are both wrong. A subagent forbidden to spawn satisfies this requirement by owning the diff directly with the same review separation. Send no "standing by" reply that waits on a nested agent. **Check** the subagent or the directly owned diff is present and no nested-agent wait remains.
   - Follow [**Comments**](../SKILL.md#comments). **Check** the diff follows the Comments rule.
   - Make surgical edits. Re-ground against the source for upstream-derived files. **Check** the edit is surgical and the source was checked when the file is upstream-derived.
   - Port shared-primitive improvements to all consumers and verify each consumer. **Check** every consumer is updated and verified.
   - Commit liberally. **Check** the delegated unit has a commit.
   **Done when** the reviewed diff has the named scope, data shape, organizing structure, success criteria, no `Task.model`, the required `arena` review when multiple shapes exist, the required Comments handling, source re-grounding for upstream-derived files, verification for every consumer, and a commit.
5. Verify the result on the matching surface. Treat an inconclusive result or a wrong surface as a failed pass. Flag either condition. **Done when** a conclusive matching-surface result is recorded. If the result is inconclusive or the surface is wrong, stop the pass claim, flag the condition, and do not mark the step passed.
6. Rebase into small, ordered commits. Stack follow-ups. Apply [`sequence-verifiable-units`](../../principle-sequence-verifiable-units/SKILL.md) by building, verifying, and committing each small unit before starting the next. **Done when** every unit was verified before the next began, and the commits are small, ordered, rebased, and followed by stacked follow-ups.
7. If the design is contested, run [`interrogate`](../../interrogate/SKILL.md) before shipping. **Done when** you have determined whether the design is contested. If it is contested, `interrogate` has completed before shipping.
8. Run [Opening a PR](opening-a-pr.md). **Done when** the Opening a PR procedure has completed.

**Code-coupled work.** For one feature or one migration, use a single owner and keep the checkpoint inline. Let the owner fan out internally after the blocking phase. Use parent-level fan-out only for slices that produce independent artifacts, such as audits, cross-subsystem investigations, or competing experiments. Rewrite the checkpoint at phase boundaries. Spawn a fresh owner instead of chaining interrupts. **Done when** the owner, blocking phase, allowed fan-out boundary, and phase-boundary checkpoint are explicit.

**Reply:** State what you built, what you chose and why, and open decisions. Use tables for design alternatives.
