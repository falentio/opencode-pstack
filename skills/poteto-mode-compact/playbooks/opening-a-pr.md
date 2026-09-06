### Opening a PR

Invoke this playbook at the end of every other playbook. Start the first step only after the preceding playbook has completed.

1. **Worktree.** Work from a git worktree off `main`. Let subagents inherit that worktree. If multiple `Task` calls use the same branch, give each call its own worktree, or run `git fetch && git reset --hard origin/<branch>` between calls. If a branch is dirty with unrelated work, patch out the unrelated work, create a fresh worktree, and apply the patch. If a worktree is snarled, reset it from `main` and redo the work minimally.
   **Check.** The intended changes are in a clean worktree off `main`. If multiple `Task` calls share a branch, each call has its own worktree or the reset command separates the calls.

2. **Commits.** Commit liberally. Before opening PRs, rebase into small, ordered commits. Treat each commit as a future PR. Make each commit landable and order commits to tell the story. Amend a fix when it belongs in a just-made commit. Create a new commit when the fix is separable.
   **Check.** The branch has small, ordered, landable commits. Every fix is amended or separated according to whether it belongs in the just-made commit.

3. **PRs.** Before committing, run `/deslop` from `cursor-team-kit` over the diff. Before review, run `/no-comments`. Write every PR title, PR description, and commit body with `/technical-writing`, then apply `/unslop`. Apply every technical-writing layer except Diataxis. Use one word for each action. Keep articles. Avoid `-ing` when a plain verb works.
   **Check.** `/deslop` has run over the diff before each commit. `/no-comments` has run before review. Each title, description, and commit body has passed `/technical-writing` and then `/unslop`, with every technical-writing layer except Diataxis applied. Action wording uses one word per action, keeps articles, and uses a plain verb instead of `-ing` when one works.

4. **Titles.** Format each PR title as `type(scope): subject` using Conventional Commits. Use `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `perf` as the type. Use the changed area, such as `pstack` or `poteto-mode`, as the scope. Keep the subject short and imperative. Apply the same `/technical-writing` and `/unslop` pass as the body. Name a real symbol when one carries the change. Use `fix(pstack): retarget opening-a-pr babysit trigger` as an example. End the subject without a period.
   **Check.** Each title uses the required pattern, an allowed type, a changed-area scope, a short imperative subject, and a real symbol when one carries the change. Each title has both writing passes and no trailing period.

5. **Descriptions.** Use these sections in order. Drop a section when it is empty.
   - `## Why`. State the intent and why the approach fits.
   - `## Scope`. State facts from the diff. Name real symbols and paths. Name both sides of a rename or retarget. State what is in and out when the boundary matters.
   - `## Tradeoffs`. State real choices only. Skip this section when there are none.
   - `## Blast Radius`. State who and what the change touches. Explain why the change is safe or risky. If `main` is red without the fix, name the continuing cost.
   - `## Verification`. State how you ran each check and its rigor. Name the real path, such as `control-cli`, `control-ui`, or the targeted tests. State the outcome of each check, not only the command name.

   After these sections, attach videos or screenshots when they prove a claim. Use no `## Summary` or `## Test plan` boilerplate. Write new detail in the commit body instead of restating its subject.
   **Check.** The description contains the nonempty sections in the stated order. Any attached media proves a claim. It contains no `## Summary` or `## Test plan` boilerplate. Each commit body adds detail instead of restating its subject.

6. **Size and stacks.** Prefer five narrow PRs to one large PR. Stack follow-ups with Graphite (`gt`). Keep the ordered stack visible to reviewers. Branch from `main` only for independent work. Rebase on `main` before substantial stack work.
   **Check.** The plan prefers five narrow PRs to one large PR. Follow-up stacks use Graphite and remain visible to reviewers. Independent work branches from `main`. Substantial stack work follows a rebase on `main`.

7. **Readiness.** Open every PR ready, never as a draft. Cloud-agent PR tools default to draft, so set `draft: false` on every PR creation call. If a PR still opens as a draft, run the host's ready command, such as `gh pr ready <number>`. Run `gh pr view <number>` before you refer to PR status.
   **Check.** Every PR is ready. Every creation call sets `draft: false`. Any draft is made ready with the host command. Every status reference follows `gh pr view <number>`.

8. **Babysit.** Opening a PR does not start a babysit. Post the URL and keep building. Finish the phase or stack first. Run a separate babysit pass only when the user asks for one after the whole stack exists. A babysit for each new PR stalls the build and spends checks on commits that later waves restart. Push back when feedback drifts from intent.
   **Check.** The PR URL is posted and work continues through the phase or stack without a babysit. A separate babysit runs only after the whole stack exists and the user asks for it. If feedback drifts from intent, the agent pushes back.

9. **Subagent PRs.** A subagent that opens a PR runs `interrogate`, `/deslop`, and `/no-comments`. It returns the URL and does not babysit. Return to the parent.
   **Check.** The subagent has run all three commands, returned the PR URL, and stopped without babysitting. Control has returned to the parent.
