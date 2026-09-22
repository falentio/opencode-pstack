import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog, loadSkillDefs, toSkillInfo } from "../src/catalog.ts";
import { buildPotetoTools } from "../src/poteto-tools/index.ts";
import { staticSessionDir } from "../src/poteto-tools/session-dir.ts";
import { takePendingResume, type PotetoEvidence } from "../src/poteto-compaction.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("the v2 tool registry holds 25 uniquely named tools", () => {
  const tools = buildPotetoTools({ sessionDir: staticSessionDir("/tmp") });
  assert.equal(tools.length, 25);
  assert.deepEqual([...new Set(tools.map((tool) => tool.name))].length, 25);
  for (const name of ["poteto_check_plan", "poteto_orch_init", "poteto_watch_pr_status", "poteto_worktree_audit"]) {
    assert.ok(tools.some((tool) => tool.name === name), name);
  }
});

test("every tool input is a closed object schema", () => {
  const tools = buildPotetoTools({ sessionDir: staticSessionDir("/tmp") });
  for (const tool of tools) {
    const input = tool.input as { type?: string; additionalProperties?: boolean; properties?: Record<string, unknown> };
    assert.equal(input.type, "object", tool.name);
    assert.equal(input.additionalProperties, false, tool.name);
    assert.ok(input.properties && typeof input.properties === "object", tool.name);
  }
});

test("the catalog loads skills and markdown agents", () => {
  const catalog = loadCatalog(packageRoot);
  assert.ok(catalog.skillsDir.endsWith("skills"));
  assert.deepEqual(
    catalog.agents.map((agent) => agent.name),
    ["comment-sicko", "poteto-agent"],
  );
  for (const agent of catalog.agents) {
    assert.equal(agent.mode, "subagent");
    assert.ok(agent.description.length > 0);
    assert.ok(agent.prompt.length > 0);
  }
  const skills = loadSkillDefs(catalog.skillsDir);
  assert.ok(skills.length >= 50, `expected at least 50 skills, saw ${skills.length}`);
  const poteto = skills.find((skill) => skill.id === "poteto-mode");
  assert.ok(poteto);
  assert.ok(poteto.path.startsWith(catalog.skillsDir));
  assert.ok(poteto.content.length > 0);
  for (const skill of skills) {
    toSkillInfo(skill);
  }
});

test("toSkillInfo rejects malformed skills", () => {
  assert.throws(() => toSkillInfo({ id: "", name: "x", description: "d", path: "/s/SKILL.md", content: "c" }));
  assert.throws(() => toSkillInfo({ id: "x", name: "x", description: "", path: "/s/SKILL.md", content: "c" }));
  assert.throws(() => toSkillInfo({ id: "x", name: "x", description: "d", path: "relative.md", content: "c" }));
});

test("pending resume is consumed one-shot per session", () => {
  const pending = new Map<string, PotetoEvidence>();
  pending.set("s1", { kind: "slash-command", detail: "go" });
  assert.ok(takePendingResume(pending, "s1"));
  assert.equal(takePendingResume(pending, "s1"), undefined);
  assert.equal(takePendingResume(pending, "s2"), undefined);
});
