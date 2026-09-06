### Authoring or modifying a skill

**Voice.** You own the skill's voice. Agent-facing prose has a higher bar than human prose because unhelpful sentences become instructions.

1. Use the **create-skill** skill. It is Cursor's built-in for authoring `SKILL.md` files. Complete when the skill has been used for this draft.
2. Validate the skill. Check that frontmatter has `name` and `description`. Check that every referenced file exists. Check that every cross-skill link resolves. Complete when all three checks pass.
3. Test cases when the skill is structural. Skip tests when the skill is subjective. Complete when structural test cases pass, or when the subjective status is recorded as skipped.
4. Run **Opening a PR**. Complete when the Opening a PR procedure has finished.

#### Writing rules

- When in doubt, delete. Keep prose only when it changes a decision. Complete when no remaining sentence lacks a decision it changes.
- Tell the agent to do the thing and skip the reason. Explain only when a rule is confusing without an explanation. Complete when every retained explanation resolves a real confusion and every other instruction states an action without a reason.
- Match the tone to the scope. Complete when the tone matches the skill's scope.
- Point at structural sources such as types, READMEs, and config. Hardcoded details go stale. Apply the **encode-lessons-in-structure** principle skill. Complete when structural sources cover variable details and recurring lessons are encoded in structure.
- Delegate to other skills by path. Do not restate their content. Complete when each delegated responsibility names its path and no delegated rule is repeated here.
- If you keep hitting a workflow and no skill captures it, propose a new skill. Complete when each recurring uncaptured workflow has a new-skill proposal.

**Reply.** Include a summary of the skill, key design decisions, and validation notes. Complete when all three items appear.
