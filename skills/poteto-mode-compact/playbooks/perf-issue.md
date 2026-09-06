### Perf issue

**You own the measurement story. Plan, review, and verify the numbers. Tie every fix to a measurement. Do not replace measurement with source reading.**

1. Capture a baseline trace through the matching control skill.

   Completion criterion. A baseline trace artifact exists at a recorded path, and the matching control skill captured it.

2. Use `how` to ground hypotheses. Run the workload before claiming a performance ceiling.

   Most fixes come from eight strategy families. Use them as hypothesis generators, not as a checklist. Attempt a family only when the trace shows the signal it names. Prefer a focused fix for the dominant cost over applying all eight.

   - **Elimination.** Remove work that does not need to run before optimizing the hot path. Check for a computation nobody consumes, a feature gate that is always off for this user, a sync that redundantly mirrors state, or a legacy path kept "just in case". The trace shows what is slow, not what is deletable. Use the `how` pass for that judgment, not the profiler. Deleting the work beats every other family when it applies.
   - **Divide and conquer.** When the dominant cost scales with input size, split the work so each piece touches less. Chunk it, shard it, prune the search space, or run independent pieces in parallel.
   - **Caching.** When the same computation or fetch repeats on identical inputs, store and reuse the result. Name what invalidates the result before claiming the win.
   - **Indirection.** Put expensive hot-path work behind a cheaper intermediate when it can absorb that work. Use an index instead of a scan, a queue to move work off the interactive thread, or a handle that lets a cheaper implementation swap in. Add the hop only when it removes more from the critical path than it adds. A layer on the hot path that removes no work is pure cost.
   - **Batching.** When many small operations each pay a fixed overhead such as an RPC, query, syscall, or draw call, coalesce them and pay the overhead once per batch.
   - **Redundancy.** When the wait hangs on one slow instance or attempt, duplicate the work and take the fastest result. Use replicas, hedged requests, or speculative execution. This trades extra load for lower tail latency. The trace must show that the wait dominates and that the system has headroom. Duplication without that tradeoff only adds load.
   - **Lazy evaluation.** Defer work when its cost lands on results that are never used or are not needed yet. Defer eager initialization on the boot path or rendering for offscreen items until first use.
   - **Scheduling.** Move work that must happen out of the interactive moment. Use idle callbacks, background warmup after boot, precomputation before the user arrives, or cleanup after the frame commits. Scheduling differs from lazy evaluation. Lazy evaluation runs work later when it is needed. Scheduling often runs work earlier than the hot moment or in its shadow. The win is perceived latency, so measure the interactive path, not total work done.

   Completion criterion. The workload has run, every attempted family has a matching trace signal, the focused hypothesis targets the dominant cost, and no performance ceiling is claimed without a run.

3. Plan the fix from the trace. If the fix crosses a function boundary, run `architect` first. Delegate implementation to a subagent on the inherited parent model. Omit `Task.model` and review the diff. Capture a post-fix trace.

   Apply the **sequence-verifiable-units** principle skill. Verify each attempt before trying the next.

   Completion criterion. The plan names the trace signal, the focused change, and the post-fix trace. Each attempt is verified before the next begins. Any delegated implementation uses the inherited parent model, omits `Task.model`, and has a reviewed diff.

4. Parse and compare the artifacts with JSON to sqlite and a diff as applicable. Treat "Inconclusive" and wrong-surface results as failures. Flag them.

   Completion criterion. The artifacts have been parsed and compared, and every inconclusive or wrong-surface result is explicitly flagged rather than marked as a pass.

5. Cite the measurement in the PR.

   Completion criterion. The PR contains a citation to the measurement.

6. Run [Opening a PR](opening-a-pr.md).

   Completion criterion. The linked Opening a PR playbook has been run.

**Routing gate.** For sustained improvement against a metric rather than a one-off fix, use the [Hillclimb playbook](hillclimb.md).

**Reply:** baseline number, post-fix number, delta, artifact path.
