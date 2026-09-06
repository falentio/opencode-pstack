### Multi-phase or multi-PR plan

**You own the plan, not the code. The plan is a checklist an owner runs box by box and the operator audits from the evidence.** Use this playbook for work that spans phases or stacked PRs. The plan is the deliverable. Do not implement.

1. When the change is one or two files with an obvious approach, skip the plan. Say so and stop. **Completion check.** You have either sent that response and stopped, or established that the change needs a plan.
2. Settle open questions by prototype before you write. For a question about layout, timing, behavior, or whether an API works, run `playbooks/prototype.md` through [the Prototype playbook](prototype.md). Keep the branch, the SHA, and the screenshots for Appendix A. Ask the operator only about a product or preference call that no run can settle. Give options (the **never-block-on-the-human** principle skill). **Completion check.** Every open question is recorded in Appendix A with its branch, SHA, and screenshots, or is marked unproven. Only product or preference calls that no run can settle remain for the operator.
3. Explore in subagents with `subagent_type: "poteto-agent"`, omitting `Task.model` so each inherits the parent chat model (the **guard-the-context-window** principle skill). Each returns file pointers, conventions, test commands, and entry points. No inlined dumps. **Completion check.** Every exploration result has those four fields and uses file pointers instead of an inlined dump.
4. Copy the skeleton below into the plan file and fill every placeholder. Unless the operator names a path, write the file under the agent store's `docs/`. Keep every heading and every sub-block in the order shown. One section per PR. One PR is one change with its own evidence (the **sequence-verifiable-units** principle skill). Name the execution playbook in **How to read this**. Pick between `playbooks/autopilot-full.md` and `playbooks/autopilot-stack.md` per the rule at the end of `playbooks/autopilot-stack.md` through [the Autopilot stack playbook](autopilot-stack.md). A standing program takes `playbooks/orchestrate.md` through [the Orchestrate playbook](orchestrate.md). **Completion check.** The plan exists at the named or default path, every placeholder is filled, every PR has one change and its evidence, and all headings and sub-blocks remain in source order.
5. Write under `/technical-writing` in full, then `/unslop`. The body is one Diataxis mode, how-to. Appendices hold explanation and reference. Two rules apply verbatim. "i dont want any abstract metaphors" and "write like hemingway". Each heading states the task or the finding. No long dashes. No mid-sentence colons. **Completion check.** The plan has one how-to body, explanation and reference appendices, task or finding headings, the two exact rules, no long dashes, and no mid-sentence colons.
6. Run `node skills/poteto-mode/scripts/check-plan.mjs <plan.md>` and fix every line it prints (the **encode-lessons-in-structure** principle skill). It enforces the skeleton's shape, the verification rule in every verification block, and the punctuation rules. **Completion check.** The command exits successfully after every reported problem is fixed.
7. Hand back. Post the plan path and the script's output, then stop. Execution starts on the operator's explicit go, under the execution playbook the plan names. **Completion check.** The reply contains the plan path and script output, and no execution has started.

**Verification.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked (the **prove-it-works** principle skill). That sentence is the verification rule. Every verification block opens with it. The live block is mandatory. Ten lanes on the inherited parent model at the PR head drive the real surface through its control skill, per the **swarm** skill. Each lane is one box with a concrete scenario, the screenshot it saves, and its pass predicate. The perf block names the metric, the probe, the trunk baseline measured first, and the rule with the number that fails. A PR that changes an interaction is review-gated. The operator reviews it in chat with screenshots and a video before merge. A PR that changes no interaction writes `**Review gate.** None. <PR id> is not review-gated.` and has no boxes under it. **Completion check.** Every PR has checked unit, live, and perf boxes. Every live lane has a scenario, screenshot, and pass predicate. Every perf block has its metric, probe, first trunk baseline, and failing number. Interaction changes have the required review evidence. Non-interaction changes use the exact no-gate line and no boxes.

**Control skill.** Pick it by surface. Browser, Electron, and web UIs use `control-ui` from `cursor-team-kit`. CLIs and TUIs use `control-cli` from `cursor-team-kit`. Native mobile uses whatever simulator-driving skill the repo has. A PR that touches two surfaces gets lanes on both. A surface with no control skill is a risk in Appendix C, and its live block still names how each lane drives it. **Completion check.** Every surface has the required control skill or an Appendix C risk, and every affected surface has live lanes with driving instructions.

````markdown
# <Program> plan

<Under ten lines. What changes, for whom, the rule the program enforces, and the PR ids in order. Complete when the intro has fewer than ten nonblank lines and contains all four items.>

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `skills/poteto-mode-compact/playbooks/<execution playbook>.md`. <Who merges, and which PR ids are the operator's items that stop at merge-ready.> **Completion check.** The execution playbook, merger, and operator-owned PR ids are named.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on her explicit go. **Complete when the protocol and plan are stated and execution has not begun.**
- [ ] On her go, arm a `/goal` with this exact text. "<The plan path, the PR ids in order, the verification rule, who merges, and the done condition.>" **Complete when the exact `/goal` text is armed after explicit go.**
- [ ] Read these from trunk at program start. Re-read them at every tick. **Complete when every listed path has been read from trunk at program start and again at every tick.**
  - [ ] `git show origin/main:skills/poteto-mode-compact/playbooks/<execution playbook>.md` **Complete when the execution playbook was read from trunk.**
  - [ ] `git show origin/main:skills/swarm/SKILL.md` **Complete when the swarm skill was read from trunk.**
  - [ ] `git show origin/main:<control skill path>` **Complete when the control skill was read from trunk.**
  - [ ] `git show origin/main:skills/poteto-mode-compact/playbooks/opening-a-pr.md` **Complete when the opening-a-pr playbook was read from trunk.**
  - [ ] `git show origin/main:skills/<each other leaf skill the program uses>` **Complete when every other program leaf skill was read from trunk.**
- [ ] Arm the 30-minute audit tick as a real terminal `/loop`. Never leave the cadence to memory. **Complete when a real terminal `/loop` runs at the 30-minute cadence.**
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from trunk and the armed /goal. Audit the operation against both and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then send the operator a status message, whether or not anything changed, with the queue table of PR, owner, state, and head SHA, the verdicts since the last tick, what merged, open operator gates, and blockers." **Complete when every tick uses that exact prompt and sends the required status message.**
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once. **Complete when every owner has received the zero-writes order on hold or stand-down.**

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names. **Complete when every PR has one owner assigned to the full named lifecycle.**
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or base it on the parent branch when the execution playbook stacks. **Complete when every dependency and its allowed start condition is recorded.**
  - [ ] <PR id> and <PR id> are independent and first. Both branch from `main`. **Complete when each independent PR branches from `main`.**
  - [ ] <PR id> after <PR id>. **Complete when the dependent PR starts only after the named parent condition.**
- [ ] Hold the file boundaries. <PR id or class> touches only `<glob>`. **Complete when every owner has a non-overlapping allowed file boundary.**
- [ ] Hold the review gate. <PR ids> change an interaction. They wait for the operator's review in chat with screenshots and a video before merge. **Complete when every interaction PR is marked review-gated and waits for that review evidence.**

### PR mechanics, for every PR

- [ ] Open the PR ready, never draft, with `gh pr create` and `draft: false`, or with Graphite `gt` for a stack. **Complete when every PR is ready and uses the named creation path.**
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on. **Complete when lint and typecheck each ran once before the push and hooks were on.**
- [ ] Run `/deslop` before each commit and `/no-comments` before review. **Complete when both required checks have run at every required point.**
- [ ] Triage every Bugbot and security-reviewer comment per `../../poteto-mode/references/bugbot-triage.md`. **Complete when every such comment has a recorded fix, dismiss, or ask decision.**
- [ ] Rebase onto current trunk before babysit and again before the merge-ready report. **Complete when both rebases are complete against current trunk.**

### Verdict and merge, for every PR

- [ ] At the merge-ready head SHA, run the swarm per `skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. One audit lane that reads the diff and the receipts and distrusts the PR body. **Complete when the swarm reports all named lanes at the exact merge-ready SHA.**
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner. A new head gets a fresh swarm and a fresh verdict. **Complete when every lane is `PASS`, or every finding is with the owner and the new head has a fresh verdict.**
- [ ] <The merge or append rule from the execution playbook, with the patch-id rule from `skills/poteto-mode-compact/playbooks/shipping.md`.> **Complete when the named merge or append rule and patch-id rule are satisfied.**

### Boot recipe, for every live lane

Each live lane runs at the PR head via the Task tool. Drive through `control-ui` or `control-cli` from `cursor-team-kit` where available. **Complete when each lane has a PR-head start and a control-skill driving path.**

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`. **Complete when the lane runs at the exact head SHA.**
- [ ] <Start the backend and the surface. Wait for ready.> **Complete when the backend and surface are ready.**
- [ ] <Deliver input only through the control skill's commands. Name the read-only diagnostics.> **Complete when all input uses control-skill commands and diagnostics are named.**
- [ ] Save every screenshot to `/tmp/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the report. **Complete when every screenshot exists at the required path and every path is in the report.**

## <Task as a verb phrase> (<PR id>)

**Depends on.** <PR id, or None.>

**Files.**

- [ ] Edit `<path>`. **Complete when the path contains only the intended edit.**
- [ ] Create `<path>`. **Complete when the new path exists with the intended contents.**
- [ ] Delete `<path>`. **Complete when the path is absent and its deletion is intended.**

**Build.**

- [ ] <One change. Name the symbol and the file.> **Complete when one symbol-level change and its file are named.**

**You see.**

- [ ] <One observable result, with the exact log line or screen state.> **Complete when the observable result and exact log line or screen state are recorded.**

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] <Test file and the case it gains.> Run `<command>`. **Complete when the named case passes with the recorded command.**

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the inherited parent model at the PR head, per the boot recipe.

- [ ] Lane 1. <Scenario.> Save `<slug>.png`. Pass when <predicate>. **Complete when the scenario passes and the screenshot exists.**
- [ ] Lane 2. <Scenario.> Save `<slug>.png`. Pass when <predicate>. **Complete when the scenario passes and the screenshot exists.**
- [ ] Lane 3. <Scenario.> Save `<slug>.png`. Pass when <predicate>. **Complete when the scenario passes and the screenshot exists.**
- [ ] Lane 4. <Scenario.> Save `<slug>.png`. Pass when <predicate>. **Complete when the scenario passes and the screenshot exists.**
- [ ] Lane 5. <Scenario.> Save `<slug>.png`. Pass when <predicate>. **Complete when the scenario passes and the screenshot exists.**
- [ ] Lane 6. <Scenario.> Save `<slug>.png`. Pass when <predicate>. **Complete when the scenario passes and the screenshot exists.**
- [ ] Lane 7. <Scenario.> Save `<slug>.png`. Pass when <predicate>. **Complete when the scenario passes and the screenshot exists.**
- [ ] Lane 8. <Scenario.> Save `<slug>.png`. Pass when <predicate>. **Complete when the scenario passes and the screenshot exists.**
- [ ] Lane 9. <Scenario.> Save `<slug>.png`. Pass when <predicate>. **Complete when the scenario passes and the screenshot exists.**
- [ ] Lane 10. <Scenario.> Save `<slug>.png`. Pass when <predicate>. **Complete when the scenario passes and the screenshot exists.**

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. <What is measured.> **Complete when the metric is named.**
- [ ] Probe. <The command or procedure, run at trunk and at the head, interleaved.> **Complete when the probe runs at trunk and head in interleaved order.**
- [ ] Baseline. Record the trunk <value> first. **Complete when the trunk value is recorded before the head value.**
- [ ] Rule. <Head against trunk, with the number that fails.> **Complete when the failure number and head-versus-trunk rule are explicit.**

**Review gate.** The operator reviews before merge.

- [ ] Copy lane <n> screenshots into `<media path>/<pr-id>-review-<slug>.png`. **Complete when the review screenshots exist at the named media paths.**
- [ ] Record a 30 to 60 second video of the change on a lane VM. Save it as `<media path>/<pr-id>-review.mp4`. **Complete when the video is 30 to 60 seconds and exists at the named path.**
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click. **Complete when the evidence is posted and the plan is stopped at merge-ready until the click.**

If the PR changes no interaction, replace this block with `**Review gate.** None. <PR id> is not review-gated.` and keep it box-free.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA. **Complete when the root verdict is clean at that SHA.**
- [ ] Bugbot triage done. **Complete when every Bugbot and security-reviewer comment has a triage decision.**
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged. **Complete when the rebase is complete and the patch-id is unchanged.**
- [ ] <The owner squash-merges its own PR, or the root appends the PR to the Graphite stack and the operator lands it.> **Complete when the named merge or append action is finished by the named actor.**

## Close the program

- [ ] Every box above is checked with its evidence. **Complete when every box is checked and its evidence exists.**
- [ ] Reply to the operator with the report the execution playbook names. **Complete when the named report is sent to the operator.**

## Appendix A. Prototype evidence

<Each open question a prototype answered, with the branch, the SHA, and the artifact links. Each question that stays unproven. Complete when every open question is recorded with evidence or marked unproven.>

## Appendix B. Alternatives rejected

<Each approach weighed and why it lost. Complete when every considered approach has its rejection reason.>

## Appendix C. Risks

<Each risk with the PR it lands in and what the owner watches. Complete when every risk names its PR and owner watch.>

## Appendix D. Links and reading list

<Docs to read before editing. Which PRs get `skills/how/SKILL.md` and `skills/interrogate/SKILL.md`. The trail per `skills/show-me-your-work/SKILL.md`. Complete when every required doc, PR skill assignment, and trail is listed.>
````

**Reply.** The plan path, the PR ids with their dependencies and the review-gated set, what the prototypes proved and what stays unproven, and the check script's output. **Completion check.** The reply contains all four report fields and execution has not started.
