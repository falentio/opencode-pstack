### Session pickup

**Own the resume point. Read the prior trail. Do not redo it.** Use this playbook for "take over this", "resume this conversation", "continue from <transcript path>", "you're taking over", "pick up where X left off", or a pushed branch you're meant to continue.

A pickup is inheritance. The prior agent already paid the cost of reading the code, running the repros, and making the design choices. Redoing loses the bias check and burns context. Read the trail instead of re-deriving it.

1. Locate the prior trail.
   Use a local transcript under the active workspace's storage directory or use a pushed branch. The system prompt names the transcript path. Do not glob across unrelated workspace directories.
   Read the metadata overview and last messages first. Then scan back for the decision points.
   Parse a long transcript in a subagent. Keep the reduced timeline in the main thread. Apply the **principle-guard-the-context-window** skill.
   **Complete when.** You have identified the local transcript or pushed branch. For a transcript, you have read its metadata overview and last messages before scanning its decision points. For a long transcript, you have kept its reduced timeline in the main thread.

2. Reconstruct operational state.
   Record the branch and worktree, what already landed, the open todos, and the decisions made. Inspect what already landed with `git log` and `git diff` against the base. Treat the prior trail as authoritative input. Resist the bias to re-derive it.
   **Complete when.** Your state record names the branch, worktree, landed changes, open todos, and decisions, and includes the results of `git log` and `git diff` against the base.

3. Diff done vs pending.
   Compare what shipped against what was planned. Name the resume point. Do not re-run the prior repro or redo completed work. A "let me verify from scratch" pass is the tell that you are treating the authoritative trail as untrustworthy. Return to the trail instead.
   **Complete when.** The shipped work is compared with the planned work, the resume point is named, and no prior repro or completed work was rerun or redone.

4. Route the remaining work.
   Route the remaining work to the matching playbook. Pick one verdict. Continue the execution, ship a finished recommendation, ratify or override a prior conclusion, or postmortem a failed run.
   The pickup playbook ends here after the verification gate in step 5. The routed playbook owns the rest. Do not execute the routed playbook during pickup.
   **Complete when.** The matching playbook and exactly one verdict are recorded, and no routed work has started.

5. Verify the inherited claims against the original goal.
   Check the real artifact with the **principle-prove-it-works** skill. A passing prior self-report is not the proof.
   **Complete when.** Every inherited claim has been checked against the original goal on the real artifact, and the handoff is ready for the routed playbook. Stop this playbook after this check.

**Reply.** Include where the prior agent stopped, what you inherited versus what you redid, ideally nothing redone, the resume point, and the outcome. The reply is complete only when all four fields are present.
