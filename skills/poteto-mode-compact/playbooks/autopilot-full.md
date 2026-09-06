### Autopilot-full

**You own the verdicts, never the PRs.** One owner runs each PR from build to merge. Nothing merges without your clean swarm verdict. Use this playbook for "autopilot this queue", "full autopilot", and one-owner-per-PR programs. Drive a queue of independent PRs to merged with full autonomy. `Orchestrate` runs a standing program whose coordinator lands verified work itself and whose workers never merge. In this playbook, each PR owner carries the full lifecycle through merge, while the root keeps only verification, countersigns, and audits.

1. **Mark the operator's items and honor state-then-wait.** Keep items named by the operator with the operator. She reviews and clicks, and no owner merges an item she named. If she asks only for the protocol or plan, state it and stop. Start execution only after her explicit go. On that go, arm a `/goal` with the full program objective. Keep the goal active across turns until the queue is done.

   **Completion criterion.** Every operator-named item is marked as operator-owned, every protocol-only request ended without execution, and an explicit go armed one `/goal` containing the full objective that remains active until the queue is done.

2. **Spawn one owner per PR with the full lifecycle.** Spawn one OpenCode subagent for each PR. Each owner handles the following work.

   - Build the PR.
   - Register the PR with `gt`.
   - Self-prove the real artifact with the **prove-it-works** principle skill.
   - Triage Bugbot skeptically using [`bugbot-triage.md`](../../poteto-mode/references/bugbot-triage.md).
   - Run the slop-strip with the `deslop` skill from the `cursor-team-kit` plugin at `/deslop`.
   - Run `/no-comments`.
   - Restack onto current trunk. Complete this before babysit and do not wait for drift or conflicts.
   - Run the babysit loop to green with the local [playbooks/babysit.md](./babysit.md).
   - Keep a `decisions.tsv` trail per the **show-me-your-work** skill. Never commit the trail. Return it with the reports.
   - The merge is the one step an owner may not take alone. Step 4 gates it.

   **Completion criterion.** Each PR has exactly one owner, and that owner's report records the build, `gt` registration, real-artifact proof, skeptical Bugbot triage, slop-strip, `/no-comments`, a current-trunk restack before babysit, a green babysit result, an uncommitted `decisions.tsv` trail, and a merge gated by step 4.

3. **Run owners in true parallel and never stack.** Run many owners at once when the PRs are self-contained. Use one writer per branch and keep their files disjoint. Let rebase absorb cross-PR drift. Serialize only genuinely overlapping work. Branch self-contained PRs straight from main. For sequenced work, merge first and then branch. Register every PR with `gt`. Treat the Graphite-metadata rule as a UI rule, not a stack rule. The only exception is an owner splitting a genuinely dependent change, which may use a short private stack.

   **Completion criterion.** Every self-contained PR has one writer on a branch from main, every PR is `gt`-registered, disjoint work ran in parallel, overlapping work was serialized, sequenced work branched after merge, and any private stack is short and genuinely dependent.

4. **Swarm-verify every merge-ready head before its merge.** At the owner's merge-ready head SHA, fan out parallel independent verifiers per the **swarm** skill and aggregate one verdict. Keep the fan-out mechanics in that skill. Do not restate them here. Run these lanes at that SHA.

   - Re-run the gates.
   - Prove the load-bearing behavior live on the real surface touched by the change. Use `control-cli` or `control-ui` from `cursor-team-kit` as the change demands.
   - Audit the receipts and the diff. Distrust the PR body.

   The live lane is the floor. A verdict without it is not clean. Do not merge without the root's clean verdict. Send findings back to the owner for fix-forward. Give every new head a fresh swarm and a fresh verdict.

   **Completion criterion.** Every merge-ready head has one aggregate verdict pinned to its SHA, all three lanes ran, the live lane passed, the root marked the verdict clean, and every fix-forward head received a fresh swarm and verdict before merge.

5. **On a clean verdict the owner merges and takes the next item.** Let the owner merge only from a head freshly restacked on trunk. Make the merge-ready report at a trunk-current head, and pin the swarm verdict to that SHA. If trunk moves before the merge, use the patch-id rule in the local [playbooks/shipping.md](./shipping.md) for re-verification. A new head voids the verdict unless the patch-id is unchanged. The owner squash-merges the owner's own PR and takes the next self-contained queue item. The operator's full-autonomy grant and the root's clean verdict authorize the merge. Babysitting alone never authorizes it. Stop operator-named items at merge-ready and wait for the operator's click.

   **Completion criterion.** Each merged PR came from a freshly restacked trunk-current head with a verdict pinned to that SHA, any trunk movement followed the shipping patch-id rule, the owner squash-merged and took the next self-contained item, and every operator-named item is waiting at merge-ready for the operator's click.

6. **Run the root layer.** Treat a genuinely new raise of a pinned gate or budget value as requiring a fresh countersign. This includes a limit that CI only lets tighten. Grant the countersign only after verifier proof. Treat values already landed on main as drift, not a raise.

   - Run an audit tick over all owners roughly every 30 minutes.
   - The root arms each tick as a real terminal `/loop`.
   - Use a monitored-shell 30-minute sleep and emit an output-notification sentinel.
   - Keep the cadence out of memory and lossy completion notifications.
   - At each tick, re-read this playbook from trunk with this command.

     ```
     git show origin/main:skills/poteto-mode-compact/playbooks/autopilot-full.md
     ```

   - Re-read the armed `/goal` after re-reading the playbook.
   - Audit the operation against both.
   - Fix drift during that tick as urgent work.
   - Probe each owner with a generic liveness or status check and collect the decision trails.
   - Count only side effects as progress. Count commits, pushes, PR or check deltas, and stored reports.
   - Treat a lane that passes its expected runtime without a side effect as stuck.
   - Stand the stuck lane down and dispatch a replacement at once. Do not wait for a polite return.
   - When merges batch, run a retro pass and a post-merge bot-comment sweep.

   **Completion criterion.** Each audit tick has a terminal `/loop` with a monitored-shell 30-minute sleep and output-notification sentinel, rereads the trunk playbook with the exact command and the armed `/goal`, audits and fixes drift, probes every owner, collects trails, counts only the listed side effects, replaces every stuck lane without waiting, and runs both post-batch sweeps when merges batch.

7. **Stand down instantly on the operator's stop.** Send the operator's hold or stand-down to every owner as a zero-writes order immediately. Keep the owners' briefs on hold until the operator releases them.

   **Completion criterion.** Every owner received the zero-writes order immediately, and every owner is holding its brief until an explicit release.

**Reply.** Return all of these fields.

- The queue with each PR's owner, state, and head SHA.
- Each verdict and the swarm that produced it.
- What merged and what each owner took next.
- Countersigns granted and why.
- Open operator gates.
- Where the collected decision trails live.
