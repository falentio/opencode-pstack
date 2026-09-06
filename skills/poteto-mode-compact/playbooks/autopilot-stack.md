### Autopilot-stack

**Own the stack, never the landing.** Build and verify the queue with full autonomy. Hand the operator one linear Graphite stack that she reviews and lands herself. Use this playbook for "autopilot-stack", "stack them, don't ship", or "build the stack, I'll land it". This playbook is the sibling of **Autopilot-full**. Its owner loop and verification gate match Autopilot-full. Only its terminal differs. A clean verdict authorizes the owner's merge in Autopilot-full. Autopilot-stack appends a link to the one reviewed chain. Nothing auto-ships.

1. **Run the owner loop unchanged.**
   - Start one OpenCode subagent per PR.
   - Give each owner end-to-end responsibility for its own change.
   - Have each owner build the change.
   - Have each owner register its own PR with `gt`.
   - Have each owner self-prove the gates, CI, and receipts.
   - Have each owner run skeptical Bugbot triage with [the shared Bugbot triage reference](../../poteto-mode/references/bugbot-triage.md).
   - Have each owner run a slop-strip with the `deslop` skill from the `cursor-team-kit` plugin via `/deslop`.
   - Have each owner run `/no-comments` with the **no-comments** skill.
   - Have each owner babysit to green with [the local Babysit playbook](babysit.md).
   - Start owners in parallel when their work is self-contained.
   - Have every owner keep a `decisions.tsv` trail through **show-me-your-work**.
   - Never commit the trail.
   - Return the trail in the report.
   - **Completion check.** Every PR has exactly one owner report. Each report records every listed owner action, the uncommitted `decisions.tsv` trail, and its return with the report. Self-contained owners ran in parallel.

2. **Audit on the wake chain.**
   - Have the root run an audit tick roughly every 30 minutes.
   - Have the root arm each tick as a real terminal `/loop`.
   - Make the loop use a monitored-shell 30-minute sleep.
   - Make the loop emit an output-notification sentinel.
   - Keep the cadence in the armed loop.
   - Never leave the cadence to memory or lossy completion notifications.
   - At each tick, re-read this playbook from trunk with `git show origin/main:skills/poteto-mode-compact/playbooks/autopilot-stack.md`.
   - At each tick, re-read the armed `/goal`.
   - Audit the operation against both.
   - Fix drift during that tick.
   - Treat that fix as urgent.
   - Probe each owner with a generic liveness or status check.
   - Count only side effects as progress.
   - Count commits, pushes, PR or check deltas, and store reports as side effects.
   - Treat a lane that passes its expected runtime without a side effect as stuck.
   - Stand the lane down.
   - Dispatch a replacement at once.
   - Do not wait for a polite return.
   - **Completion check.** The current tick has an armed terminal `/loop`, a monitored-shell 30-minute sleep, an output-notification sentinel, both rereads, an audit against both, urgent drift handling, and a probe for every owner. Progress evidence is limited to commits, pushes, PR or check deltas, and store reports. Every stuck lane was stood down and replaced.

3. **Hold the operator gates.**
   - Use state-then-wait.
   - Treat a request to state the plan as no authorization to go.
   - On the operator's explicit go, arm a `/goal` with the full program objective.
   - Keep the goal active across turns until the chain is done.
   - On the operator's stop, put every owner on an immediate zero-writes hold.
   - **Completion check.** Before go, the plan is stated and the run is waiting. After explicit go, the armed `/goal` contains the full program objective and remains active until the chain is done. After stop, every owner is in an immediate zero-writes hold.

4. **Verify at STACK-READY.**
   - Require the owner to report `STACK-READY` with the exact head SHA.
   - Have the root swarm-verify that SHA with the **swarm** skill.
   - Fan out independent verifiers in parallel.
   - Have each verifier rerun the gates at that SHA.
   - Include a live runtime floor over the load-bearing behavior.
   - Include a receipts-and-diff audit that distrusts the PR body.
   - Aggregate the swarm's results into one verdict.
   - Send findings back to the owner.
   - Nothing enters the stack unverified.
   - **Completion check.** The owner report names the exact SHA. Independent verifiers reran the gates at that SHA. The live runtime floor and the receipts-and-diff audit are complete. The swarm produced one verdict. Every finding went back to the owner. No unverified PR entered the stack.

5. **Append on a clean verdict. Never ship.**
   - Keep every owner from merging, arming auto-merge, or closing.
   - On a clean verdict, append the PR to the one linear Graphite stack.
   - Use verified order, or the order the operator specified.
   - **Completion check.** Every appended PR has a clean verdict and a verified or operator-specified position in the one linear stack. No owner merged, armed auto-merge, or closed a PR.

6. **Single writer on topology. Parallel writers on builds.**
   - Let each owner push only its own branch.
   - Run an `ls-remote` check before `git push --force-with-lease`.
   - Require each owner to report its tip and intended parent.
   - Let the root own stack topology.
   - Have the root register each append locally with `gt track -p <current-tip>`.
   - Have the root then run `gt submit --no-interactive --stack` from the tip.
   - Remember that `gt submit` walks from trunk.
   - Do not pull branches unrelated to your slice into that walk.
   - **Completion check.** Each owner push changed only its own branch and followed the `ls-remote` check. Each owner reported its tip and intended parent. Self-contained owner builds ran in parallel. The root alone registered every append locally with the two commands in order. The `gt submit` walk contained no branch unrelated to the owner's slice.

7. **Absorb drift at the root, then re-verify what moved.**
   - When trunk moves, have the root absorb it by restacking the chain with `gt restack` and `gt sync`.
   - If a restack surfaces a conflict in an owner's files, have that owner fix its own slice.
   - Then have the root push the result.
   - Treat a restack as rewriting every SHA above it.
   - Treat verdicts at the old SHAs as void.
   - Compare `git patch-id` at each verdict SHA with the new head.
   - Send anything that actually drifted through step 4 before delivery.
   - Apply the countersign rule from Autopilot-full unchanged.
   - A genuinely new pin raises a stop for the root's fresh countersign.
   - Absorbing drift of landed values is not a raise.
   - **Completion check.** The root absorbed trunk movement. Every restack conflict in an owner's files was fixed in that owner's slice, and the root pushed the result. Every old verdict SHA was compared with the new head by `git patch-id`, and old verdicts were treated as void. Every result that drifted actually went through step 4 again before delivery. A genuinely new pin raised the root's fresh-countersign stop. Drift that only absorbed landed values did not raise it.

8. **Deliver the chain.**
   - Deliver one linear chain of verified PRs.
   - Make the chain reviewable bottom-up in the Graphite UI.
   - Put each link's verifier verdict in the PR body or a comment.
   - Have the operator review and land the chain.
   - The operator uses her own clicks or merge-when-ready that she arms herself.
   - **Completion check.** The handoff contains one linear, verified, bottom-up Graphite chain. Every link carries its verifier verdict in its PR body or a comment. Landing remains an operator action through her own clicks or merge-when-ready that she arms herself.

**Choosing between the autopilots.** Choose Autopilot-full when the PRs are independent and landing authority is granted. Choose Autopilot-stack when the operator wants review before landing, the work is sequenced or coupled, or merge authority is withheld.

**Reply.** Include links to the stack root and tip. Give a one-line verdict summary for each link. List anything parked or excluded and its reason.
