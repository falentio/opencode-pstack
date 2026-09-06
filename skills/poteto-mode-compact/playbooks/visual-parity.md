### Visual parity

**Scope and gate.** You own pixel-exact equivalence. The baseline is the spec. Do not touch it. Use this playbook for "make X match Y exactly" requests, styling-system migrations, and UI ports across frameworks. Verify equivalence with an image diff, not by eye.

1. Establish the baseline before any migration.
   - Build a visual regression harness that screenshots the current component across every state.
   - When matching two implementations, screenshot the target too.
   - Treat the baseline as a blocking prerequisite, not a follow-up.
   - Make no parity claim without a baseline.
   - **Completion criterion.** The harness contains captures for every current-component state and, when two implementations are matched, the target. No migration has started and no parity claim has been made without the baseline.

2. State and hold the anti-shortcut clauses.
   - Do not modify the harness.
   - Do not tamper with the baseline.
   - Do not restructure the component to make a diff pass.
   - If the baseline looks wrong, stop and ask. Do not edit it.
   - **Completion criterion.** The harness and baseline are unchanged, no component restructuring was used to make a diff pass, and, if the baseline looks wrong, the run has stopped and the agent has asked before editing it.

3. Migrate one component at a time per owner. Treat each component as an independent artifact. Parallelize independent component migrations across separate worktrees with one owner per component. Apply [the separate-before-serializing-shared-state principle](../../principle-separate-before-serializing-shared-state/SKILL.md). Migrate shared primitives first. Treat shared-primitive migration as a blocking phase.
   - **Completion criterion.** Every component migration has one owner, parallel migrations use separate worktrees, and all shared primitives are migrated before dependent components.

4. Verify each component against its baseline through an image diff on the matching surface. Use the control skill. Treat any nonzero diff as a failure. Investigate the pixel delta. Do not wave a nonzero diff through. Run `/loop` for each component until the diff is zero.
   - **Completion criterion.** Every component has a matching-surface image diff of zero after its pixel deltas were investigated, and its `/loop` ends only at zero.

5. Run **Opening a PR** for each component or safe batch.
   - **Completion criterion.** **Opening a PR** has run for every component or safe batch that contains migrated components.

**Reply.** Report the components migrated, the diff result for each, the baseline harness location, and what remains.
