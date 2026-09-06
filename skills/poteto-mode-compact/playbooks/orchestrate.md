### Orchestrate

**You own the program, never the code.** Author briefs, drain the queue, keep the frontier green, and decide. Use this playbook for a whole project handed to one standing coordinator chat. The project may run for multiple days and use many stacked PRs and dozens to hundreds of subagents. The human may check in twice a day instead of every five minutes.

One task driven to a predicate is an Autonomous run. One ambitious run that needs a bespoke workflow is figure-it-out. Use Orchestrate when the work outlives one agent. Work that one agent could finish within the session budget is not a program. In one measured head-to-head, this playbook's ceremony turned a half-hour 12-unit job into one landed unit while a plain agent landed all 12. Below that line, use Autonomous run.

Scale the ceremony with the program. Every gate costs coordinator minutes. On cheap, near-identical units, collapse the ceremony as each section directs instead of paying the full list price.

Three rules carry the rest.

- Completions are queue events, not interrupts.
- Every spawn and every resume carries the standing orders verbatim.
- The brief is the product. A vague brief fails quietly because a worker cannot ask you a question.

Open a todo list with the steps below copied verbatim. Keep a skipped step in the list with `skip: <reason>`.

#### Roles and placement

- **Coordinator.** Keep the coordinator local. The coordinator frames the work, authors briefs, drains the inbox, owns the human report, and makes judgment calls. The coordinator never authors or edits code. Conflicted merges, restacks, and code changes are tasks. The coordinator may mechanically land a verified unit by fast-forward or clean cherry-pick of a worker commit followed by a push when local git is cheap. Queueing finished work behind an idle stacker wastes the deadline. Run the loop agentically from end to end. Spawn, resume, and drain agents only through the Task tool. At drain points, read and write state through `skills/poteto-mode/scripts/orch/orch.ts`, using one command in and one line out to conserve context. The CLI never spawns, waits, or wakes anything.
- **Sub-coordinator.** Keep each sub-coordinator local and durable. Use one per track only when the program exceeds what one coordinator's drains can manage. A track that the coordinator can drain itself needs no middle layer. Each nested layer pays a full orientation preamble, and a blocking sub-coordinator hides its children while the parent idles. A sub-coordinator owns its track's units and boards, authors worker briefs, spawns workers and verifiers, and may nest to depth 3. Roll up aggregates at wave boundaries. Never forward raw child reports. Cap in-flight children at what one drain can process, roughly ten, as a rolling window. Never use blocking batches because every batch pays for its slowest child.
- **Worker and verifier.** Run workers and verifiers as OpenCode subagents through the Task tool on the same host. Prefer fewer, broader workers. Give each worktree or branch one writer. This follows the separate-before-serializing-shared-state principle. Run a unit's verifier as an independent pass on the inherited parent model.

Keep the depth at coordinator, track, and worker. Author the track decomposition per project. Build, landing, and verification are common cuts, not a required shape. Hard-coded swarm trees were tried and parked as too rigid.

#### Store layout

Create `orchestrate/<project-slug>/` in the current agent's store. The system prompt gives the store path. Give every file exactly one writer. Owners publish facts. Readers aggregate facts at read time. Use `bun skills/poteto-mode/scripts/orch/orch.ts` for bookkeeping and call it `orch` below. Keep the canonical plain TSV and JSON readable without the CLI.

- `preferences.md` is the standing-orders register. Use numbered lines with one constraint per line. Record model policy, stack shape and count, verification bar, forbidden paths, and escalation policy. Paste it verbatim into every spawn and every resume. Directives decay across resumes, and every dropped directive costs a human turn. When you catch yourself restating an instruction, append the line before acting. This applies the encode-lessons-in-structure principle.
- `overview.md` is the durable PR and issue database. Append to it. Never rewrite it wholesale for one event.
- `units.tsv` has one row per unit with its id, track, state, branch, PR, head SHA, and brief path. Update rows in place.
- `frontier.json` is the computed merge frontier. Follow the Stack safety section.
- `ledger.tsv` is the verification ledger. Follow the Verification section.
- `inbox/` holds completion pointers. `gates.md` holds human gates with the question, options, and default on no answer so a completion flood cannot erase AskQuestion state.
- `decisions.tsv` is the trail required by the show-me-your-work skill.
- `status.md` is derived from `units.tsv` and `ledger.tsv` at each drain. Regenerate it from the tables. Do not hand-maintain it or narrate events into it because hand-churned boards are rewritten on every event and become unreadable.

#### The brief

Prompts to agents are the only product. Every spawn carries the whole brief. A field that cannot be filled means the unit is not scoped yet.

```
GOAL         one sentence with the outcome, executable by a stranger with no chat access
SCOPE        paths this unit may write, paths it may not, and its exclusive worktree or branch
CONTEXT      pointers to files and PRs. Paste upstream reports in full when this unit depends on them because workers cannot see siblings
ACCEPTANCE   checkable criteria, one per line
VERIFY       exact commands or the control-skill path, plus known gotchas
TIMEBOX      rough cap on runtime. On expiry, return partial findings and stop instead of running on
FORBIDDEN    no gt, no rebase, no force-push, no fixes outside scope, plus unit-specific bans
REPORT       status, branch, head SHA, PRs, verdict, what you actually ran, deviations, and suggested follow-ups
STANDING     <preferences.md pasted verbatim>
```

Size the brief to the unit. Collapse the template to a paragraph for a one-command unit, but still name its goal, scope, verify command, and report shape. A 4KB scaffold around a two-line edit costs more to write and obey than the edit. Keep every brief self-contained. Carry the standing orders verbatim on every spawn and every resume.

A sub-coordinator brief adds its track boundary and unit list, spawn budget, drain protocol, and rollup format. The rollup lists each child by name, status, PR, head SHA, verdict, and one line. It also gives track status and frontier delta.

Treat a dependency as a context relay, not only as ordering. Undeclared upstream context makes the worker guess. Missing fields are a refuse-to-spawn condition. Audit one sampled worker brief per sub-coordinator per wave while that wave runs. Never put the audit in front of the wave as a gate. A failing brief stops that track and fixes the sub-coordinator's instructions, not only the worker, because brief quality decays late in a run. Never resume-chain a brief. Respawn fresh with consolidated scope.

#### Steps

1. **Frame.** State the done predicate as something countable, such as "all 126 units merged, each ledger-verified `unit-test-verified` or better". Quantify the units, rough effort, expected stacks, and wall-clock budget. If one agent could finish inside that budget, stop here and run Autonomous run instead. A collapse must not depend on another document being present. Do the work directly in this session, use plain workers where they help, verify inline, land as you go, and use none of the store, register, or pilot machinery below. Schedule landing against the budget. By roughly 70 percent of the budget, stop spawning and land what is verified because finished but unlanded work counts as zero. Name the tracks per project. Send a contested decomposition or an irreversible choice through the arena skill before the pilot. Present the framing once. Let reversible preparation proceed without waiting.
   Completion check. The framing records a countable predicate, units, effort, expected stacks, wall-clock budget, named tracks, and a 70 percent landing cutoff. It also records either the Autonomous run collapse with its excluded machinery or the program decision, and it routes every contested decomposition or irreversible choice before the pilot.
2. **Install the runtime.** Run `orch init`. Open the trail through the show-me-your-work skill. Write the standing orders before any spawn. Seed `frontier.json` from existing PRs with `orch frontier set --repo <repo-dir>`.
   Completion check. `orch init` has run, the trail is open, the standing orders exist before any spawn, and `frontier.json` contains the seeded existing PR frontier.
3. **Pilot.** Push one unit through the whole path. The path is the brief, worker, verification, stack entry, ledger row, and merge. Use the pilot to falsify the brief template, verify recipe, and unit size while the cost is one agent instead of fifty. Fix the contract from pilot evidence before any fan-out. Scale the pilot to the unit. For near-identical cheap units, the first unit is the pilot, runs as a normal unit with its verify command inline, and fan-out starts when it lands. Use the dedicated pilot pipeline with a separate verifier agent and audit gate only for expensive or novel unit shapes, not for clone-units where a serialized pilot has nothing to falsify.
   Completion check. One unit has a brief, worker result, verification result, stack entry, ledger row, and merge. The pilot evidence has either changed the contract or confirmed it before fan-out, and the chosen pilot path matches the unit shape.
4. **Scale.** Spawn a rolling window of workers up to the in-flight cap. Refill the window as children finish. Blocking batches pay for the slowest child of every batch. Spawn track sub-coordinators only past the one-drain threshold in Roles and placement. Recompute ready work after each drain. Relay upstream reports into downstream briefs. Keep sibling communication upward only. Run the sampled brief audit alongside the wave it samples. A failing audit stops the next refill, not the current wave.
   Completion check. The rolling window stays at or below its cap, each refill follows a drain, ready work reflects the current state, downstream briefs contain required upstream reports, sibling messages move upward only, and a failed sampled audit blocks only the next refill.
5. **Drain.** Run the queue discipline below at every drain point.
   Completion check. The queue discipline has run at the current drain point, every pointer has a classification, the resulting state is recorded, and the next wave has either spawned or has a recorded reason to wait.
6. **Land.** Treat landing as continuous, never as a terminal phase. Start integration with the first verified unit and run it alongside the remaining waves. On a heavy repository, keep a stacker as a standing role from wave one and have it integrate units as they verify. On a repository where local git is cheap, land verified units yourself as the coordinator. Keep the frontier green before upper-stack work. Let Stack safety govern. Advance `frontier.json` only on a merge or reported new head SHA.
   Completion check. Every verified unit is either landed or recorded for landing, integration is active while waves continue, the frontier is green before upper-stack work, and `frontier.json` changed only for a merge or a reported new head SHA.
7. **Close.** Drain the final inbox. Reconcile every spawned agent to a terminal row of done, abandoned, or zombie-reconciled. Confirm the predicate on the real artifact. Confirm that every landed PR has a verdict for its current head SHA. Audit the trail through show-me-your-work, including its independent trail review. Encode recurring corrections into `preferences.md` or the brief template. Leave the store intact because it is the postmortem.
   Completion check. The final inbox is empty, every spawned agent has a terminal row, the real artifact satisfies the predicate, every landed PR has a verdict for its current head SHA, the trail has an independent review, recurring corrections are encoded, and the store remains present.

#### Queue and drain

- **Record a completion.** On a completion notification, run `orch inbox push <agent> <unit> <status> [--report PATH]` and return to the work in progress. Never deep-review inline. A completion that needs review becomes a verifier unit. Never review a diff inside a drain.
  Completion check. The notification has one inbox pointer, and no inline diff review has occurred.
- **Drain in batches.** Drain at the end of a critical section, at a track rollup, at a frontier watcher wake, and before a human report. Arm the frontier watcher through the loop skill and use a long heartbeat fallback. Begin every batch with `orch inbox drain`. Arrivals during a drain wait for the next batch.
  Completion check. The drain has one of the four triggers, begins with `orch inbox drain`, and leaves arrivals during the batch for the next batch.
- **Finish critical sections first.** Treat authoring a brief, a stack operation, a conflict decision, writing a gate, and updating the ledger or frontier as critical sections.
  Completion check. Any finished critical section has reached a drain point before its results are treated as queue state.
- **Classify every pointer.** Classify each pointer as landed, needs-verify, failed, zombie, or noise. Write the resulting rows through `orch unit add`, `orch unit set`, and `orch ledger record`. Run `orch status`. Spawn the next wave in one message.
  Completion check. Every drained pointer has one of the five classifications, its rows are written with the named commands, `orch status` has run, and the next wave is in one spawn message.
- **Account for every child.** At the track rollup, record every spawned child as arrived, respawned, or explicitly absorbed by scope. Silently redoing a missing child's work hides wasted spend and the coverage gap that child's result existed to close.
  Completion check. The rollup accounts for every spawned child with exactly one of the three outcomes.
- **End the drain turn.** End with the three lines from `orch status` that show counts against the states, what changed, and gates open. Keep detail in `status.md`. Use the full reply contract at checkpoints and close.
  Completion check. The reply contains the three status lines, and details are in `status.md` rather than in an event narrative.

#### Stack safety

- Treat the frontier as a computed object, never as narrative. Recompute `frontier.json` from `gt` after every merge and stack mutation because GitHub base refs drift mid-restack while `gt` tracking is authoritative. The frontier contains the ordered PR list, branch names, head SHAs, a generation number, and the lowest unmerged PR. Resolve it where `gt` knows the stack, normally in the stacker's clone. A checkout whose `gt` metadata never saw the submits reports no PRs and the command errors rather than guessing.
  Completion check. The current `frontier.json` comes from `gt` after the latest merge or stack mutation and contains all five required frontier values.
- Allow exactly one stacker per stack to run `gt`. Serialize that work within the stack. Record the holder in the standing orders.
  Completion check. The standing orders name one current `gt` holder for each stack, and no other stacker is running it.
- Keep workers off restacks. Workers never rebase and never run `gt`. Run one babysitter per stack through the [Babysit playbook](babysit.md), scoped to one immutable frontier generation. Have babysitters report conflicts to the stacker instead of restacking.
  Completion check. Worker and babysitter reports show no worker rebase or `gt` use, each stack has one generation-scoped babysitter, and conflicts are with the stacker.
- Route PR closes and retargets through the stacker only. Closing a base PR orphans every chain above it. Treat merges and stack surgery as units with briefs like any other unit.
  Completion check. Every close, retarget, merge, and stack surgery has a stacker owner and a brief when it is a unit.
- Keep one retro watcher on merged PRs for reverts, post-merge CI breaks, and orphaned follow-ups.
  Completion check. The merged PRs have one active retro watcher with those three checks.

#### Verification

Scale verification to the unit. When `VERIFY` is one cheap command, the worker runs it and reports the output, and the coordinator spot-checks receipts. Use an independent verifier agent on the inherited parent model for units whose verification is expensive, judgment-laden, or high-blast-radius. A verifier agent whose entire product would be rerunning one command is ceremony, not verification.

Write ledger rows with `orch ledger record`. Check the current PR and head SHA with `orch ledger check`. `ledger.tsv` has one row per verdict, keyed by PR number and head SHA. Use one of these verdicts

`live-ui-verified | unit-test-verified | type-check-only | verifier-blocked | verifier-failed`

CI green is an input to a verdict, not a verdict. Behavioral work needs a result better than `type-check-only`. `verifier-blocked` is not a pass. Respawn when the environment heals. `verifier-failed` gets a fix unit, not a re-verify. A worker may self-report. A verifier overrides the worker on the same key. A new head SHA voids the row, so re-verify after a restack. The ledger answers "was this verified" rather than relying on memory or the transcript.

A unit is not done until its output is externalized when it lands. Never batch externalization to the end of the run. The worker pushes its branch. The verifier writes its ledger row. Receipts land in the store. Work that exists only on one VM when that VM dies was never done.

Verification check. The current PR and head SHA have a ledger row with an allowed verdict, the verdict matches the unit's verification level, blocked and failed results have the required follow-up, and the worker, verifier, and receipt artifacts are externalized.

#### Liveness and failure

- Never resume an agent to check on it. A resume restarts an idle agent. Probe the ledger, `units.tsv`, `gh`, and pushed branches. Transcript mtime is not liveness.
  Completion check. Liveness evidence comes from the ledger, `units.tsv`, `gh`, or a pushed branch, not a resume or transcript mtime.
- Record a silent death as a synthetic postmortem row in the inbox with the unit, failure mode, last evidence, and options. Replan as evidence arrives. Never wait for full quiescence.
  Completion check. The inbox contains the four postmortem fields, and replanning does not wait for other agents to become quiet.
- Retry by mode. For a cap hit or OOM, respawn with smaller scope. For a network drop, retry as-is. For a tool error, retry on the inherited parent model. For an unknown failure, retry once. After two retries, abandon the unit and replan around it.
  Completion check. Every retry has one of the four modes, and any unit with two retries is abandoned and replanned rather than retried again.
- Reconcile a zombie that returns hours late against the current frontier and ledger before accepting anything because the world moved while it slept. Salvage unique findings through a fresh unit. Never blind-merge them.
  Completion check. A late result has a current frontier and ledger comparison, and any salvage moves through a fresh unit.
- When continued spawning would produce garbage tree-wide because of bad upstream output, broken acceptance, or dead infrastructure, write a stop line at the top of the standing orders. Let in-flight work finish. Fix the cause. Clear the stop line.
  Completion check. A tree-wide stop has a written cause, in-flight work is allowed to finish, the cause is fixed, and the stop line is cleared before spawning resumes.
- Bound infrastructure retries the same way as child retries. After a few consecutive tool aborts, stop retrying. Write a terminal handoff to durable state with what is done, where it lives, and the exact command to resume. End the run. Hours of retry loops against a dead executor produce nothing a handoff would not.
  Completion check. A dead executor has either recovered within the retry bound or has a durable handoff with the three required fields and an exact resume command.
- After a restart, re-read the standing orders and `units.tsv`, recompute the frontier, and reattach work by PR and branch rather than agent id. Respawn one sub-coordinator per track from its stored brief and current state. Drain, then resume. The dead session's store lock clears itself on the next write. `orch` replaces a lock whose holder pid is gone.
  Completion check. After restart, standing orders and `units.tsv` have been reread, the frontier recomputed, work reattached by PR and branch, tracks respawned from stored state, and the queue drained before resuming.

#### Escalation

Batch human gates into the status page instead of sending one item at a time. Reach the human for force-pushes to shared branches, deploys, deletions, closing someone else's PR, genuine product or preference calls that no experiment can settle, a standing order that contradicts observed reality, or a program-level dead end that survived a replan. Park each gate in `gates.md` with its question, options, and default before asking. Route work around the gate.

Keep frontier nudges, restack mechanics, retries, CI flake triage, review-thread triage, format fixes, forbidden scope, and the question "should I keep going" away from the human. Refuse scope that the brief forbids and continue. When in doubt, act and log. Deferring is the measured failure mode.

When a discovery occurs mid-run, fix only what blocks the frontier. Put everything else in follow-ups. At this fan-out, a small scope leak multiplies into PRs nobody asked for.

Escalation check. Every human ask is an irreversible action, a genuine unresolved product or preference choice, a contradictory standing order, or a replanned program dead end. Each ask is in `gates.md`, and non-gated work has continued around it.

**Reply**

At checkpoints and close, report every field below. Take all numbers from `units.tsv` and `ledger.tsv`, not from narrative.

- The predicate and the count against it.
- The tracks and what each track landed.
- The frontier with its PR list and SHAs.
- The verdict summary.
- What was abandoned and why.
- Gates awaiting the human. These are the only asks.
- The store path.
- The trail path.
- PR links.

Reply check. The report contains every field above, uses table values for every number, and includes a PR link for every reported PR.
