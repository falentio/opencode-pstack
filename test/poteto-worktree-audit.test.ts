import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WORKTREE_AUDIT_HEADER,
  buildWorktreeAuditTool,
  classifyRow,
  formatTable,
  parseHumanSize,
  type WorktreeRow,
} from "../src/poteto-tools/worktree-audit.ts";
import { buildPotetoTools } from "../src/poteto-tools/index.ts";
import { staticSessionDir } from "../src/poteto-tools/session-dir.ts";

function row(partial: Partial<WorktreeRow> = {}): WorktreeRow {
  return {
    size: "1.2G",
    age: "3d",
    merged: "no",
    dirty: "clean",
    remote: "pushed",
    pr: "-",
    lastChat: "-",
    bucket: "review",
    worktree: "/repo/wt-a",
    ...partial,
  };
}

test("tracked edits hold the worktree", () => {
  assert.equal(classifyRow({ dirty: "wip:3", pr: "-", recent: false, merged: false }), "hold-wip");
});

test("an open PR holds before recency", () => {
  assert.equal(classifyRow({ dirty: "clean", pr: "#12/OPEN", recent: true, merged: false }), "hold-open-pr");
});

test("a merged branch is safe without a PR marker", () => {
  assert.equal(classifyRow({ dirty: "clean", pr: "-", recent: false, merged: true }), "safe");
});

test("a closed PR is safe even when the merge flag missed a squash", () => {
  assert.equal(classifyRow({ dirty: "scratch:2", pr: "#9/MERGED", recent: false, merged: false }), "safe");
});

test("quiet idle work falls back to review", () => {
  assert.equal(classifyRow({ dirty: "clean", pr: "-", recent: false, merged: false }), "review");
});

test("a recent chat gates before safe", () => {
  assert.equal(classifyRow({ dirty: "clean", pr: "-", recent: true, merged: true }), "verify-recent-chat");
});

test("formatTable emits the header with per-row LAST_CHAT", () => {
  const table = formatTable([row({ bucket: "review" }), row({ bucket: "hold-wip", worktree: "/repo/wt-b" })]);
  const lines = table.split("\n");
  assert.equal(lines[0], WORKTREE_AUDIT_HEADER);
  assert.equal(lines.length, 3);
  assert.match(lines[1] ?? "", /-\treview\t\/repo\/wt-a/);
});

test("formatTable surfaces a recent LAST_CHAT marker", () => {
  const table = formatTable([row({ lastChat: "recent", bucket: "verify-recent-chat" })]);
  assert.match(table.split("\n")[1] ?? "", /recent\tverify-recent-chat/);
});

test("parseHumanSize orders legacy size strings descending", () => {
  assert.ok(parseHumanSize("99M") < parseHumanSize("1.2G"));
  assert.ok(Number.isNaN(parseHumanSize("?")));
});

test("the tool is registered under its native name", () => {
  assert.equal(buildWorktreeAuditTool({ sessionDir: staticSessionDir("/tmp") }).name, "poteto_worktree_audit");
  assert.ok(
    buildPotetoTools({ sessionDir: staticSessionDir("/tmp") }).some((tool) => tool.name === "poteto_worktree_audit"),
  );
});
