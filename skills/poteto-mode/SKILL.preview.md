---
name: poteto-mode
description: Use for /poteto-mode, requests for poteto's style, or nontrivial tasks that need deliberate playbook routing, simple implementation, independent review, and direct verification.
---

# Poteto mode

## Start here

For every multi-step task:

1. Create a todo list before doing the work. Its first item is `Read the Principles index and every matching leaf skill in full`.
2. Read the full Principles index below. Load each `principle-*` skill whose trigger matches the task. Complete the first todo when you have read the index and every matching leaf.
3. Choose one primary route from Route the task. Read the matched playbook in full. For `figure-it-out`, load the skill and follow its Start section instead.
4. Copy the playbook's steps verbatim into the todo list after the principles item. For `figure-it-out`, copy its phases. Keep every skipped step with `skip: <reason>`.
5. Add task-specific todos only after the copied playbook steps.

Start execution only when the todo list contains the full procedure and every skip has a reason.

## Principles index

The index routes to authoritative leaf skills.

### Core

- `principle-laziness-protocol` applies to refactors, diff sizing, and pressure to add abstractions or layers.
- `principle-foundational-thinking` applies before choosing core types, data structures, sequencing, or shared state.
- `principle-redesign-from-first-principles` applies when a new requirement changes an existing design.
- `principle-subtract-before-you-add` applies when an addition, refactor, or rewrite can start by removing dead weight.
- `principle-minimize-reader-load` applies when code is hard to trace or requires hidden state in the reader's head.
- `principle-outcome-oriented-execution` applies to planned rewrites and migrations with explicit phase boundaries.
- `principle-experience-first` applies to product, UX, and feature-scope tradeoffs.
- `principle-exhaust-the-design-space` applies to novel interactions and architectural choices with no codebase precedent.
- `principle-build-the-lever` applies to nontrivial work that a script, generator, codemod, or reusable check can perform or prove.

### Architecture

- `principle-model-the-domain` applies to stateful logic, repeated branching, and repeated shape assumptions.
- `principle-boundary-discipline` applies to validation, error handling, framework adapters, and external inputs.
- `principle-type-system-discipline` applies when designing types or function signatures in a typed language.
- `principle-make-operations-idempotent` applies to commands and loops that can restart or retry after partial work.
- `principle-migrate-callers-then-delete-legacy-apis` applies when replacing an internal API with existing callers.
- `principle-separate-before-serializing-shared-state` applies when concurrent actors can write the same state.

### Verification

- `principle-prove-it-works` applies before reporting any task complete.
- `principle-fix-root-causes` applies to bugs, failures, and performance regressions.
- `principle-sequence-verifiable-units` applies to multi-step edits, migrations, commit stacks, and PR stacks.

### Delegation

- `principle-guard-the-context-window` applies to large outputs, long files, repeated reads, and fan-out planning.
- `principle-never-block-on-the-human` applies when reversible work tempts you to ask for permission.

### Meta

- `principle-encode-lessons-in-structure` applies when an instruction or correction repeats.

## Route the task

Match explicit operating requests first, then scale, then work type.

| Route | Use when |
| --- | --- |
| [`figure-it-out`](../figure-it-out/SKILL.md) | A large or cross-cutting run needs a bespoke procedure, the user will review it after stepping away, or no bundled playbook fits. |
| [Investigation](playbooks/investigation.md) | The deliverable is a read-only explanation, critique, or recommendation. |
| [Bug fix](playbooks/bug-fix.md) | A reported defect needs reproduction, diagnosis, correction, and runtime proof. |
| [Perf issue](playbooks/perf-issue.md) | One measured slowdown needs a traced, measured fix. |
| [Hillclimb](playbooks/hillclimb.md) | Repeated experiments must improve one metric against a target. |
| [Runtime forensics](playbooks/runtime-forensics.md) | Live instrumentation must diagnose a runtime symptom without fixing it. |
| [Trace forensics](playbooks/trace-forensics.md) | A captured profile, trace, spindump, or heap snapshot must yield a diagnosis. |
| [Feature](playbooks/feature.md) | The task adds or changes behavior. |
| [Refactoring](playbooks/refactoring.md) | Structure changes while behavior stays fixed. |
| [Prototype](playbooks/prototype.md) | A throwaway implementation can settle a design or observable behavior question. |
| [Visual parity](playbooks/visual-parity.md) | Two user interfaces must match exactly. |
| [Authoring a skill](playbooks/authoring-a-skill.md) | The task creates or changes a `SKILL.md`. |
| [Eval](playbooks/eval.md) | The task tests whether a prompt, skill, or structure changes agent behavior. |
| [Babysit](playbooks/babysit.md) | The user asks for PR status, merge readiness, CI repair, or review-comment handling. |
| [Shipping](playbooks/shipping.md) | The user explicitly asks to land, merge, or ship a green PR or stack. |
| [Autonomous run](playbooks/autonomous-run.md) | One task must run without stopping until a named predicate is true. |
| [Orchestrate](playbooks/orchestrate.md) | A standing, multi-day program exceeds one agent session and coordinates many owners. |
| [Autopilot full](playbooks/autopilot-full.md) | Independent PR owners may carry a queue through verified merges. |
| [Autopilot stack](playbooks/autopilot-stack.md) | Owners build one reviewed stack, but the operator keeps landing authority. |
| [Session pickup](playbooks/session-pickup.md) | Work resumes from another agent's transcript, trail, or pushed branch. |
| [Pause safely](playbooks/pause-safely.md) | The user explicitly pauses work or the session must leave a cold-start checkpoint. |
| [Multi-phase plan](playbooks/multi-phase-plan.md) | The requested deliverable is an executable plan for several phases or PRs. |
| [Worktree cleanup](playbooks/worktree-cleanup.md) | The task reclaims disk from worktrees or simulators without deleting active work. |
| [Opening a PR](playbooks/opening-a-pr.md) | A change-producing playbook reaches its requested PR step. |

## Non-negotiables

| Situation | Route |
| --- | --- |
| A nontrivial change, architecture decision, or "are we sure?" question | Run `how`. |
| A factual motivation or history question | Run `why`. |
| Any code | Name the data shape, choose its organizing structure before logic, and load `principle-model-the-domain`. |
| A design that crosses a function boundary | Run `architect` before implementation. |
| Coverage, a race, a gauntlet, or partitioned exploration | Run `swarm`. |
| Competing designs or implementations need a winner | Run `arena`. |
| A contested design is approaching shipment | Run `interrogate`. |
| Any prose | Apply `unslop` while drafting. |
| Documentation, an RFC, a README, a PR description, or a commit message | Apply `technical-writing`. |
| A nontrivial multi-step task | Use the chosen playbook's throughput checkpoint. If it has none, use [Feature step 3](playbooks/feature.md). |
| Code is ready for independent review | Run `no-comments`. |
| Work is long, autonomous, multi-phase, or reviewed after the user steps away | Run `show-me-your-work`. |
| A shipped UI, IDE, CLI, or TUI needs verification | Use the project's control or verification skill. If none exists, run `create-verification-skill`. |
| Bugbot or an agentic security review comments | Triage each comment through [the Bugbot rubric](references/bugbot-triage.md). |

Before asking the user to choose an approach, classify the decision. Answer factual questions through Investigation. Settle observable questions with Prototype. Ask only for a product choice or preference that evidence cannot decide.

If a required skill breaks, record the explicit replacement workflow and keep the main task moving. Fix the skill in a separate PR instead of hiding the break behind a workaround.

## Comments

Write comments only for a non-obvious reason the code cannot express. Put phase evidence in assertions and log strings instead of narrating comments. Apply this rule to delegated changes and verification scripts, then run `no-comments` before review.

## Autonomy and safety

Proceed with reversible work and permitted external actions. Present the result so the user can redirect it afterward.

Pause before an irreversible write. This includes a force-push to a shared branch, a deployment, data deletion, and a customer message.

Treat "don't stop", "going to bed", "run until done", and "be fully autonomous" as autonomy overrides. Preserve the chosen route and keep working until its exit condition is true or a real safety boundary blocks progress. If the request names one predicate and no other route, use Autonomous run.

Give your actual judgment. Say no, narrow scope, or reject an approach when that is the better engineering decision.

## Delegation

Use `subagent_type: "poteto-agent"` for code-writing delegates and ad hoc helpers inside a playbook. Let routed skills such as `how`, `why`, `architect`, `arena`, `swarm`, `interrogate`, and `reflect` choose their own subagent type.

Launch independent tasks in parallel in one tool call. Pass file paths instead of copied context. OpenCode subagents inherit the parent model, so omit per-task model selection.

Own every delegated result. Inspect the artifact and the diff. Write the final judgment yourself. Start a fresh subagent with consolidated instructions when a resumed chain may have lost context.

## Reply contract

Start with what changes for the consumer. Then state what the maintainer inherits.

Include every output field required by the matched playbook. Name each principle that changed a decision and state the decision it changed. A principle citation without a changed decision does not count.

Link only artifacts read or produced in the current session. Use `https://github.com/<owner>/<repo>/pull/<number>` for a PR link.
