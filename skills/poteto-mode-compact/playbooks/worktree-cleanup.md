### Worktree and simulator cleanup

You own the disk and the safety gate. Prune merged or abandoned git worktrees and stale iOS simulators to reclaim space. Deletion is irreversible. Guard every step against deleting something in use or holding uncommitted work.

1. Snapshot and audit.
   - Record `df -h /`.
   - Run `skills/poteto-mode/scripts/worktree-audit.sh` in the background because the transcript scan is slow. This is the lever (principle-build-the-lever).
   - Make the script read paths from `git worktree list`. Never hand-type paths. A hand-typed `myrepo-worktrees/x` misses a worktree at `.cursor/worktrees/myrepo/x` (principle-encode-lessons-in-structure).
   - Confirm that the audit classifies every worktree by size, age, merge state, uncommitted work, PR state, and the newest chat that touched it. Confirm that it suggests a bucket for every worktree.
   - Completion criterion. `df -h /` is recorded. The background audit has finished. Its output lists every worktree with all required classifications and a suggested bucket.
2. Treat the bucket as advice, not permission. The pinned and active chats are the real artifact (principle-prove-it-works).
   - Get the pinned and active chat set from the user or the sidebar.
   - Cross-check every candidate against that set.
   - If the lever marks a worktree the user pinned as `safe`, keep it. The pinned set wins.
   - Completion criterion. Every candidate has been cross-checked against the pinned and active chat set. Every pinned worktree is held regardless of its bucket.
3. Verify usage before deleting.
   - For every `verify-recent-chat` row and anything you doubt, fan subagents out to read the transcripts. Have them report whether the chat is pinned or ongoing and which worktrees it touches (principle-guard-the-context-window, transcripts are bulk).
   - A pinned chat spawns arena and repro trees into sibling worktrees through background subagents. Treat those trees as in use even when their names never appear in the sidebar.
   - Completion criterion. Every `verify-recent-chat` row and every doubtful candidate has a report with the chat status and every worktree it touches. Every tree touched by a pinned chat is marked in use.
4. Pause on irreversible loss.
   - Treat `wip:N` as `N` tracked uncommitted edits. Show the diff and get a decision before deleting it. Removing a clean worktree is recoverable from its branch. Uncommitted work is gone.
   - Treat `scratch:N` as untracked throwaway content. It is safe to drop, but name the files first.
   - Per Autonomy, clean and merged and not-in-use worktrees proceed. Pause on every `wip` and every in-use worktree. `scratch` content is safe to drop after you name its files.
   - Completion criterion. Every candidate is classified as `wip:N`, `scratch:N`, or neither. Every `wip` diff has a decision. Every `scratch` file is named. Every clean, merged, and not-in-use worktree allowed by the gate is confirmed for removal. Every `wip` and in-use worktree is held.
5. Prune the confirmed set.
   - For each confirmed path, run `git worktree remove --force <path>`.
   - If the directory survives on ignored build artifacts, run `rm -rf` on it. Then run `git worktree prune`.
   - Branch refs survive, so no commits are lost.
   - Run `df -h /` and re-list the worktrees.
   - Completion criterion. Every confirmed path is removed or handled for surviving ignored artifacts. `git worktree prune` has run. Branch refs remain. The final `df -h /` output and worktree list are recorded.
6. Reclaim simulator and other storage.
   - Simulators are usually the next-biggest win.
   - Run `xcrun simctl --set testing delete all` for XCTestDevices clones.
   - Run `xcrun simctl delete unavailable`.
   - Run `xcrun simctl runtime list`, then run `runtime delete <id>` for old runtimes.
   - If more space is needed, inspect Xcode `DerivedData` and `iOS DeviceSupport`, `~/Library/Application Support/Cursor`, `state.vscdb.backup`, `snapshots/roots/<root>` where a `<root>` named for a folder you opened as a workspace balloons, and package caches for pnpm, uv, brew, and yarn.
   - Clear only caches the user has not said to keep.
   - Completion criterion. Each selected simulator, runtime, or cache target has a recorded result. No cache the user said to keep was cleared.

This is the one playbook that deletes user state with no code review to catch a slip. The gates above are the review.

**Reply.** Include `df -h /` before and after with the space reclaimed, the worktrees pruned, and a one-line reason for each held back. State which chat is using each held worktree or identify its uncommitted work.
